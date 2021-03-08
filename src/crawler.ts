import Nightmare from "nightmare";
import parse from "node-html-parser";
import { HtmlPage, IConstructorOptionsComplete, Skill, Timeframe } from "./types";
import { error, bold, isValidUrl, pause, printProgress, warning, WEEK_TIMELAPSE } from "./utils";
import { CRAWL_WEEK_START, PROXY_LIST, RATE_LIMIT_PERIOD } from "./settings";
import persistence from "./persistence";

const HIGHSCORE_ENDPOINT: string = 'http://secure.runescape.com/m=hiscore/ranking?category_type=0';
const HIGHSCORE_PAGENUMS_TO_SEARCH: number[] = [1, 51, 101, 201, 301, 401, 501, 1001, 2001, 3001];
const MAX_RETRIES = 3; // number of retries per URL

let _rateLimitPeriod: number = RATE_LIMIT_PERIOD;
const _proxyErrorCounter: [number, string][] = Array.from({ length: PROXY_LIST.length }, (_, i) => [0, PROXY_LIST[i]]);
const PROXY_DUMP_LIMIT = 5; // Remove proxies that fail more than this number of times.

/**
 * Error thown when electron browser has an unknown error.
 */
class ElectronUnknownError extends Error {
    constructor(message?: string) {
        super(message);
    }
}

/**
 * Set the period between successive crawl attempts.
 * @param ms Rate limit period in ms.
 */
function setRateLimitPeriod(ms: number) {
    if (typeof ms !== 'number') { throw new TypeError('Rate limit period must be a number.'); }
    if (ms < 0) { throw new RangeError('Rate limit period must be greater than or equal to zero.'); }

    _rateLimitPeriod = ms;
}

/**
 * Generate set of URL to crawl all page numbers for a skill, timeframe, and start time combination.
 * @param skill Skill to be scanned.
 * @param timeframe Timeframe to search in.
 * @param startTime Unix time within Timeframe to search.
 */
function geSkillHighscoreUrlSet(skill: Skill, timeframe: Timeframe, startTime: number): string[] {
    if (skill === undefined || typeof skill !== 'number') { throw new RangeError('Skill must be supplied through enum Skill.'); }
    if (timeframe === undefined || typeof timeframe !== 'number') { throw new RangeError('Timeframe must be supplied through enum Timeframe.'); }
    if (startTime < new Date('01/01/2010').getTime()) { throw new RangeError('Start time must UNIX time in ms after the year 2010.') }

    return HIGHSCORE_PAGENUMS_TO_SEARCH
        .map(pgNum => `${HIGHSCORE_ENDPOINT}&table=${skill}&time_filter=${timeframe}&date=${startTime}&page=${pgNum}`);
}

/**
 * Generator of proxies from proxy list in settings module. Cycles through each proxy in the list.
 */
const proxyGenerator: Generator<string> = (function* getProxyGenerator(): Generator<string> {
    let usingProxyNumber: number = 0;
    while (true) {
        if (usingProxyNumber >= PROXY_LIST.length) { usingProxyNumber %= PROXY_LIST.length; }
        yield PROXY_LIST[usingProxyNumber];
        usingProxyNumber++;
    }
})();

/**
 * Log navigation error for a proxy. If number of errors for a proxy exceeds PROXY_DUMP_LIMIT program will stop using that proxy.
 * @param proxy Proxy to log error event for.
 */
function logProxyErrorEvent(proxy: string): void {
    let indexErrorCounter = 0;
    for (const pxy of _proxyErrorCounter) {
        if (proxy === pxy[1]) {
            pxy[0]++;
            // Dump proxy if exceed limit
            if (pxy[0] >= PROXY_DUMP_LIMIT) {
                let index = PROXY_LIST.indexOf(pxy[1]);
                PROXY_LIST.splice(index, 1)
                _proxyErrorCounter.splice(indexErrorCounter, 1);
                console.log(error(`\nDumped proxy ${pxy[1]} due to too many errors.`));
            }
            return;
        }
        indexErrorCounter++;
    }
    throw new Error('proxy was not found in PROXY_LIST.');
}

/**
 * Print to console proxies in descending order of number of error events.
 * @param top The top number of proxies, by number of error events, to display.
 */
function printProxyErrorCount(top: number = PROXY_LIST.length): void {
    if (top !== undefined && (typeof top !== 'number' || top < 0 || top > PROXY_LIST.length)) { throw new TypeError('top must be a number greater than 0 and less than the number of proxies.'); }

    _proxyErrorCounter.sort((a, b) => b[0] - a[0]);
    console.log({ proxyErrorCount: _proxyErrorCounter.slice(0, top) });
}

/**
 * Download HTML page, after body loads all dynamic content including Javascript code.
 * @param url URL to download html page from.
 * @param useProxy Whether to use proxies from the proxy list. Default is false.
 * @throws ElectronUnknownError
 */
async function loadHtmlPage(url: string, useProxy: boolean = false): Promise<HtmlPage> {
    if (!isValidUrl(url)) { throw new RangeError('URL is not valid.'); }
    if (useProxy !== undefined && typeof useProxy !== 'boolean') { throw new TypeError('useProxy must be a boolean toggle.'); }

    const crawlerOptions: IConstructorOptionsComplete = {
        show: false,
        loadImages: false,
        webPreferences: { images: false }
    };
    if (useProxy) {
        crawlerOptions.switches = {
            'proxy-server': proxyGenerator.next().value,
            'ignore-certificate-errors': true
        };
    }

    const html: string = await new Nightmare(crawlerOptions)
        .goto(url)
        .wait('body')
        .evaluate(() => document.documentElement.outerHTML)
        .end()
        .then((response: string) => response) // TODO is this needed?
        .catch((err: Error) => {
            if (useProxy) {
                logProxyErrorEvent(crawlerOptions.switches['proxy-server']);
                throw new ElectronUnknownError(`Error using proxy: ${crawlerOptions.switches['proxy-server']}. ${err.message}`);
            } else {
                throw new ElectronUnknownError(err.name + ': ' + err.message);
            }
        });

    await pause(_rateLimitPeriod);
    return { url, html };
}

/**
 * Check if HtmlPage is a valid Jagex exp gain highscore page.
 * @param htmlPage Html page to be checked.
 */
function isValidExpGainPage(htmlPage: HtmlPage): boolean {
    if (htmlPage.html === undefined || typeof htmlPage.html !== 'string' || htmlPage.url === undefined || typeof htmlPage.url !== 'string') {
        throw new TypeError('htmlPage must implement HtmlPage interface.');
    }

    if (htmlPage.html.includes('Sorry, there are currently no players to display')) {
        persistence.saveEndpointWithoutEnoughPlayers(htmlPage.url);
        console.log(warning(`\nThere were not enough players at URL:${htmlPage.url}\nEndpoint has been saved for future calls.`));
    }
    return parse(htmlPage.html).querySelector('div.tableWrap') !== null;
}

/**
 * Load all HTML pages from Jagex highscore for a skill. This will include all weeks and all page numbers for each week.
 * @param skill Skill for which to load pages.
 */
async function getSkillWeeklyExpGainHtmlPages(skill: Skill): Promise<HtmlPage[]> {
    if (skill === undefined || typeof skill !== 'number') { throw new RangeError('Skill must be supplied through enum Skill.'); }

    const oneWeekBeforeToday = Date.now() - WEEK_TIMELAPSE;
    const weeksStartTime = [CRAWL_WEEK_START];
    while (weeksStartTime[weeksStartTime.length - 1] + WEEK_TIMELAPSE < oneWeekBeforeToday) {
        weeksStartTime.push(weeksStartTime[weeksStartTime.length - 1] + WEEK_TIMELAPSE);
    }

    const allWeeksHighscoreUrlSet = weeksStartTime.reduce((pages: string[], weekStartTime: number): string[] =>
        pages.concat(geSkillHighscoreUrlSet(skill, Timeframe.weekly, weekStartTime)), []);

    const htmlPages: HtmlPage[] = [];
    let urlIndex = 0;
    printProgress(0);
    while (urlIndex < allWeeksHighscoreUrlSet.length) {
        const loadPromises: Promise<HtmlPage | undefined>[] = [];
        for (let i = 0; urlIndex < allWeeksHighscoreUrlSet.length && i < PROXY_LIST.length; i++) {
            const url = allWeeksHighscoreUrlSet[urlIndex];
            urlIndex++;
            if (!persistence.isEndpointWithoutEnoughPlayers(url)) {
                if (persistence.isInStorage(url)) {
                    const html = persistence.getExpGainPageFromUrl(url);
                    if (html === null) { throw new Error('Datastore did not return HtmlPage after confirming it existed.'); }
                    htmlPages.push(html);
                    i--; // Proxy was not used
                } else {
                    loadPromises.push(
                        loadHtmlPage(url, true)
                            .then(page => {
                                if (page !== undefined) {
                                    if (isValidExpGainPage(page)) {
                                        persistence.saveHtmlPage(page);
                                        return page;
                                    }
                                } else {
                                    console.log(error(`\nServer responded with critical error.\n At URL: ${url}`));
                                }
                                return undefined;
                            }).catch((err: Error) => {
                                // Allow failure with notification. This way you benefit from other proxies running in parallel.
                                console.log(warning('\n' + err.message));
                                return undefined;
                            }));
                }
            } else {
                i--; // Proxy was not used
            }
        }
        printProgress(Math.round((urlIndex / allWeeksHighscoreUrlSet.length) * 100));
        await Promise.all(loadPromises)
            .then(pages => {
                pages.forEach(page => {
                    if (page !== undefined) { htmlPages.push(page); }
                })
            }
            ).then(() => {
                printProgress(Math.round((urlIndex / allWeeksHighscoreUrlSet.length) * 100));
            });
    }
    printProgress(100);
    return htmlPages;
}

/**
 * Get all HTML exp gain pages.
 * @returns Promise<HtmlPage[][]> where the row can be indexed with Skill enum values to obtain that particular skill's pages.
 */
async function getAllExpGainHtmlPages(): Promise<HtmlPage[][]> {
    setRateLimitPeriod(0);
    const skillPages: HtmlPage[][] = [];
    for (let skill in Skill) {
        const skillNum: number = parseInt(skill);
        if (isNaN(skillNum)) { continue; }
        console.log('\nFetching experience gain data for skill: ' + bold(Skill[skillNum]));
        skillPages[skillNum] = await getSkillWeeklyExpGainHtmlPages(skillNum);
    }
    setRateLimitPeriod(RATE_LIMIT_PERIOD);
    return skillPages;
}

//export default { geSkillHighscoreUrlSet, proxyGenerator, loadHtmlPage, isValidExpGainPage, getSkillWeeklyExpGainHtmlPages, getAllExpGainHtmlPages };
export default {
    loadHtmlPage,
    getSkillWeeklyExpGainHtmlPages,
    getAllExpGainHtmlPages,
    isValidExpGainPage,
    printProxyErrorCount,

    /**
     * Do not use these functions outside of testing.
     */
    __tests__: {
        geSkillHighscoreUrlSet,
        proxyGenerator,
        logProxyErrorEvent,
        _proxyErrorCounter
    }
};
