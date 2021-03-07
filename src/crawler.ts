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
    const numProxies = PROXY_LIST.length;
    let usingProxyNumber: number = 0;
    while (true) {
        yield PROXY_LIST[usingProxyNumber];
        usingProxyNumber++;
        usingProxyNumber %= numProxies;
    }
})();

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
                throw new ElectronUnknownError(`Unknown error using proxy: ${crawlerOptions.switches['proxy-server']}\n${err.name}\n${err.message}`);
            } else {
                throw new ElectronUnknownError(err.name + '\n' + err.message);
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
    printProgress(0);
    for (let [indexAsString, url] of Object.entries(allWeeksHighscoreUrlSet)) {
        if (!persistence.isEndpointWithoutEnoughPlayers(url)) {
            if (persistence.isInStorage(url)) {
                const html = persistence.getExpGainPageFromUrl(url);
                if (html === null) { throw new Error('Datastore did not return HtmlPage after confirming it existed.'); }
                htmlPages.push(html);
            } else {
                let html: HtmlPage | undefined;
                for (let retry = 0; retry <= MAX_RETRIES; retry++) {
                    html = await loadHtmlPage(url, true);
                    if (html !== undefined) {
                        if (isValidExpGainPage(html)) {
                            persistence.saveHtmlPage(html);
                            htmlPages.push(html);
                            break;
                        } else if (persistence.isEndpointWithoutEnoughPlayers(url)) {
                            // May have been updated in isValidExpGainPage call.
                            break;
                        }
                    }
                }
                if (html === undefined) {
                    console.log(error(`\nServer continues to responded with critical error after ${MAX_RETRIES} attempts.\n At URL: ${url}`));
                }
            }
        }
        const index = parseInt(indexAsString);
        printProgress(Math.round((index / allWeeksHighscoreUrlSet.length) * 100));
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

    /**
     * Do not use these functions outside of testing.
     */
    __tests__: {
        geSkillHighscoreUrlSet,
        proxyGenerator,
    }
};
