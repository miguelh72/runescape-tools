export const PROXY_LIST: string[] = [
    '176.113.73.97:3128',
    '176.113.73.104:3128',
    '37.120.133.135:3128',
    '185.253.98.18:3128',
    '84.17.51.209:3128',
    '34.92.50.186:3128',
    '92.172.165.187:8080',
    '212.98.243.155:3128',
    '51.158.107.202:9999',
    '51.158.180.179:8811',
    '138.199.30.139:3128',
    '37.235.97.16:3128',
    '138.199.31.79:3128',
    '138.199.31.82:3128',
    '138.199.30.137:3128',
    '138.199.31.78:3128',
    '62.210.203.211:8080',
].reduce((uniques: string[], proxy: string | undefined): string[] => {
    if (!uniques.includes(proxy as string)) {
        uniques.push(proxy as string)
    }
    return uniques;
}, []);

export const RATE_LIMIT_PERIOD: number = 1000; // ms

export const DATASTORE_FOLDER: string = 'datastore';

export const DAY_TIMELAPSE: number = 86400000; // ms
export const WEEK_TIMELAPSE: number = 604800000; // ms
export const YEAR_TIMELAPSE: number = 31536000000; // ms
const BASE_WEEK_START: number = 1599248196557;
export const CRAWL_WEEK_START: number = (() => {
    // Calculate first week start 365 days ago as a multiple of BASE_WEEK_START so that filenames match in datastore
    const oneYearAgo = Date.now() - YEAR_TIMELAPSE;
    let weekStart = BASE_WEEK_START;
    while (weekStart - WEEK_TIMELAPSE >= oneYearAgo) {
        weekStart -= WEEK_TIMELAPSE
    }
    return weekStart;
})();
