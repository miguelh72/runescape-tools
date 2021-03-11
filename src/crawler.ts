import Nightmare from "nightmare";
import got, { OptionsOfJSONResponseBody } from "got";
import tunnel from 'tunnel';
import { CRAWL_WEEK_START, PROXY_LIST, RATE_LIMIT_PERIOD, WEEK_TIMELAPSE } from "./settings";
import { ExpPage, HtmlPage, IConstructorOptionsComplete, Skill, Timeframe } from "./types";
import validate from "./validate";
import { error, bold, pause, printProgress, warning, TabularFunction, getExpPage } from "./utils";
import persistence from "./persistence";


const HIGHSCORE_ENDPOINT: string = 'http://secure.runescape.com/m=hiscore/ranking?category_type=0';
const HIGHSCORE_PAGENUMS_TO_SEARCH: number[] = [1, 51, 101, 201, 301, 401, 501, 1001, 2001, 3001];
const PRICE_DATA_ENDPOINT: string = 'http://www.grandexchangecentral.com/include/gecgraphjson.php?jsid=';
const MAX_RETRIES = 3; // maximum number of retries per URL

let _rateLimitPeriod: number = RATE_LIMIT_PERIOD;
const _proxyErrorCounter: { [key: string]: { timesUsed: number, timesFailed: number } } = PROXY_LIST.reduce((counter: { [key: string]: { timesUsed: number, timesFailed: number } }, proxy: string) => {
    counter[proxy] = { timesUsed: 0, timesFailed: 0 };
    return counter;
}, {});
const PROXY_DUMP_RATE = 0.3; // Percent as ratio
const MIN_USED_TIMES_FOR_DUMP = 10;

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
        const proxy = PROXY_LIST[usingProxyNumber++];
        yield proxy;
    }
})();

/**
 * Log navigation error for a proxy. If number of errors for a proxy exceeds PROXY_DUMP_LIMIT program will stop using that proxy.
 * @param proxy Proxy to log error event for.
 */
function logProxyErrorEvent(proxy: string): void {
    if (_proxyErrorCounter[proxy] !== undefined) {
        _proxyErrorCounter[proxy].timesFailed++;
        if (_proxyErrorCounter[proxy].timesUsed >= MIN_USED_TIMES_FOR_DUMP && (_proxyErrorCounter[proxy].timesFailed / _proxyErrorCounter[proxy].timesUsed) >= PROXY_DUMP_RATE) {
            let index = PROXY_LIST.indexOf(proxy);
            if (index === -1) { throw new Error('proxy was not found in PROXY_LIST.'); }
            PROXY_LIST.splice(index, 1)
            delete _proxyErrorCounter[proxy];
            return console.log(error(`\nDumped proxy ${proxy} due to too many errors.`));
        }
    } else {
        console.log(`Proxy ${proxy} was not found in proxyErrorCounter. Was it previously dumped?`);
    }
}

/**
 * Print to console proxies in descending order of number of error events.
 * @param top The top number of proxies, by number of error events, to display.
 */
function printProxyErrorCount(top: number = PROXY_LIST.length): void {
    if (top !== undefined && (typeof top !== 'number' || top < 0)) { throw new TypeError('top must be a number greater than 0.'); }
    if (top > PROXY_LIST.length) { top = PROXY_LIST.length; }

    const proxyErrorRate: { proxy: string, errorRate: number }[] = [];
    for (const proxy in _proxyErrorCounter) {
        proxyErrorRate.push({ proxy, errorRate: _proxyErrorCounter[proxy].timesFailed / _proxyErrorCounter[proxy].timesUsed })
    }
    proxyErrorRate.sort((a, b) => b.errorRate - a.errorRate);
    console.log(bold('\nProxy error report!'));
    console.log({ proxyErrorRate: proxyErrorRate.slice(0, top) });
}

/**
 * Download HTML page, after body loads all dynamic content including Javascript code.
 * @param url URL to download html page from.
 * @param useProxy Whether to use proxies from the proxy list. Default is false.
 * @throws ElectronUnknownError
 */
async function loadHtmlPage(url: string, useProxy: boolean = false): Promise<HtmlPage> {
    validate.url(url);
    if (typeof useProxy !== 'boolean') { throw new TypeError('useProxy must be a boolean toggle.'); }

    const crawlerOptions: IConstructorOptionsComplete = {
        show: false,
        loadImages: false,
        webPreferences: { images: false },
    };
    if (useProxy) {
        crawlerOptions.switches = {
            'proxy-server': proxyGenerator.next().value,
            'ignore-certificate-errors': true,
        };
    }

    async function loadPageWithRetries(retry: number = MAX_RETRIES): Promise<string> {
        if (useProxy && _proxyErrorCounter[crawlerOptions.switches['proxy-server']] !== undefined) {
            _proxyErrorCounter[crawlerOptions.switches['proxy-server']].timesUsed++;
        }
        return await new Nightmare(crawlerOptions)
            .goto(url)
            .wait('body')
            .evaluate(() => document.documentElement.outerHTML)
            .end()
            .then((response: string) => pause(_rateLimitPeriod, response) as any)
            .catch((err: Error) => {
                if (useProxy) {
                    logProxyErrorEvent(crawlerOptions.switches['proxy-server']);
                    if (retry > 1) {
                        return loadPageWithRetries(--retry);
                    } else {
                        throw new ElectronUnknownError(`Error using proxy: ${crawlerOptions.switches['proxy-server']}. ${err.message}`);
                    }
                } else {
                    if (retry > 1) {
                        return loadPageWithRetries(--retry);
                    } else {
                        throw new ElectronUnknownError(err.name + ': ' + err.message);
                    }
                }
            });
    }

    const html: string = await loadPageWithRetries();
    return { url, html };
}

/**
 * Load all ExpPage from Jagex highscore for a skill. This will include all weeks and all page numbers for each week.
 * Pages without enough players will not be included in return array.
 * @param skill Skill for which to load pages.
 */
async function getWeeklyExpPages(skill: Skill): Promise<ExpPage[]> {
    validate.skill(skill);

    const today = Date.now();
    const weeksStartTime = [CRAWL_WEEK_START];
    while (weeksStartTime[weeksStartTime.length - 1] + WEEK_TIMELAPSE < today) {
        weeksStartTime.push(weeksStartTime[weeksStartTime.length - 1] + WEEK_TIMELAPSE);
    }
    const allWeeksHighscoreUrlSet = weeksStartTime.reduce((pages: string[], weekStartTime: number): string[] =>
        pages.concat(geSkillHighscoreUrlSet(skill, Timeframe.weekly, weekStartTime)), []);

    const expPages: ExpPage[] = [];
    let urlIndex = 0;
    let numPagesWithoutData = 0;
    printProgress(0);
    let hadProxyErrorEvent = false;
    while (urlIndex < allWeeksHighscoreUrlSet.length) {
        const loadPromises: Promise<ExpPage | null>[] = [];
        for (let proxyIndex = 0; urlIndex < allWeeksHighscoreUrlSet.length && proxyIndex < PROXY_LIST.length; proxyIndex++) {
            const url = allWeeksHighscoreUrlSet[urlIndex++];
            const storedExpPage = persistence.fetchExpPage(url);
            if (storedExpPage === null) {
                loadPromises.push(
                    loadHtmlPage(url, true)
                        .then((htmlPage: HtmlPage) => getExpPage(htmlPage))
                        .catch((err: Error) => {
                            // Allow failure with notification. This allows you to benefit from other proxies running in parallel at expense of ensuring all data loaded.
                            console.log(warning('\n' + err.message));
                            if (err instanceof ElectronUnknownError) {
                                hadProxyErrorEvent = true;
                            } // else could be critical server error
                            return null;
                        }));
            } else {
                proxyIndex--; // Proxy was not used
                if (storedExpPage.hasData) {
                    expPages.push(storedExpPage);
                } else {
                    numPagesWithoutData++;
                }
            }
        }
        printProgress(Math.round(((urlIndex - loadPromises.length) / allWeeksHighscoreUrlSet.length) * 100));
        await Promise.all(loadPromises)
            .then((expPages: (ExpPage | null)[]) =>
                expPages.forEach(expPage => {
                    if (expPage !== null) {
                        persistence.saveExpPage(expPage);
                        if (expPage.hasData) {
                            expPages.push(expPage);
                        } else {
                            numPagesWithoutData++;
                            console.log(warning(`\nThere were not enough players at URL:${expPage.url}\nEndpoint has been saved for future calls.`));
                        }
                    }
                })
            ).then(() => {
                printProgress(Math.round((urlIndex / allWeeksHighscoreUrlSet.length) * 100));
            });
    }
    if (hadProxyErrorEvent) {
        printProxyErrorCount();
    }
    if (expPages.length + numPagesWithoutData !== allWeeksHighscoreUrlSet.length) {
        console.log('\nNot all pages could be loaded. Retrying to fetch experience gain data for skill: ' + bold(Skill[skill]));
        return getWeeklyExpPages(skill);
    } else {
        printProgress(100);
        return expPages;
    }
}

/**
 * Get all HTML exp gain pages.
 * @returns Promise<HtmlPage[][]> where the row can be indexed with Skill enum values to obtain that particular skill's pages.
 */
async function getAllWeeklyExpPages(): Promise<ExpPage[][]> {
    const skillPages: ExpPage[][] = [];
    for (let skill in Skill) {
        const skillNum: number = parseInt(skill);
        if (isNaN(skillNum)) { continue; }
        console.log('\nFetching experience gain data for skill: ' + bold(Skill[skillNum]));
        skillPages[skillNum] = await getWeeklyExpPages(skillNum);
    }
    return skillPages;
}

/**
 * Obtain a year's worth of Grand Exchange price data for an item with daily granularity, total of 365 datapoints. Returns undefined if no data was available.
 * @param itemID Item Grand Exchange id for which to obtain year price data for.
 * @param proxy Proxy to be used. Defaults to using no proxy.
 * @param numRetries Number of automatic retries. Defaults to MAX_RETRIES.
 */
async function getYearPriceData(itemID: number, proxy?: string, numRetries: number = MAX_RETRIES): Promise<TabularFunction | undefined> { // TODO chanfe to | null instead of using undefined
    if (typeof itemID !== 'number' || itemID < 0) { throw new TypeError('Item ID must be a number greater than zero.'); }
    if (proxy !== undefined) { validate.proxy(proxy); }
    if (typeof numRetries !== 'number' || numRetries < 0) { throw new TypeError('numRetries must be a number greater than zero.'); }

    const options: OptionsOfJSONResponseBody = {
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Referer': 'http://www.grandexchangecentral.com',
        },
        responseType: 'json',
    }
    if (proxy !== undefined) {
        const proxyHost = proxy.split(':')[0];
        const proxyPort = parseInt(proxy.split(':')[1]);
        options.agent = {
            http: tunnel.httpsOverHttp({
                proxy: {
                    host: proxyHost,
                    port: proxyPort
                },
            }),
            https: tunnel.httpsOverHttp({
                proxy: {
                    host: proxyHost,
                    port: proxyPort
                }
            }) as any
        }
    }

    async function getResponseRecursively(retries: number): Promise<[number, number][] | null> {
        if (typeof retries !== 'number' || retries < 0) { throw new TypeError('retries must be a number greater than zero.'); }

        return await got<[number, number][]>(PRICE_DATA_ENDPOINT + itemID, options)
            .then(async response => {
                if (response !== undefined) {
                    return response.body;
                } else {
                    if (retries > 1) {
                        return await getResponseRecursively(--retries);
                    } else {
                        throw new Error(error(`Error attempting to load price data ${(proxy === undefined) ? 'without a proxy.' : ('using proxy ' + proxy)}`));
                    }
                }
            })
            .then(result => pause(_rateLimitPeriod, result) as Promise<[number, number][]>)
            .catch(async (err: Error) => {
                if (retries > 1) {
                    return await getResponseRecursively(--retries);
                } else {
                    throw new Error(error(`Error attempting to load price data ${(proxy === undefined) ? 'without a proxy.' : ('using proxy ' + proxy)}\n${err.message}`));
                }
            });
    }

    const response: [number, number][] | null = await getResponseRecursively(numRetries);
    // null if no data is available or bad request
    if (response === null) { return; }
    const timeSeries: TabularFunction = new TabularFunction();
    response.forEach(([timestamp, price]) => {
        timeSeries.addDatapoint(price, timestamp);
    });
    return timeSeries;
}

export default {
    getWeeklyExpPages,
    getAllWeeklyExpPages,
    printProxyErrorCount,
    getYearPriceData,
    HIGHSCORE_ENDPOINT,

    /**
     * Do not use these functions outside of testing.
     */
    __tests__: {
        loadHtmlPage,
        geSkillHighscoreUrlSet,
        proxyGenerator,
        logProxyErrorEvent,
        _proxyErrorCounter,
    }
}
