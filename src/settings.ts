import { WEEK_TIMELAPSE } from "./utils";

export const PROXY_LIST: string[] = [
    '34.92.50.186:3128',
    '212.98.243.155:3128',
    '51.158.107.202:9999',
    '34.92.50.186:3128',
    '138.199.29.143:3128',
    '37.120.133.135:3128',
    '51.158.180.179:8811',
    '138.199.30.139:3128',
    '37.235.97.16:3128',
    '138.199.31.79:3128',
    '121.125.54.228:3128',
    '138.199.30.141:3128',
    '3.1.88.182:3128'
].reduce((uniques: string[], proxy: string | undefined): string[] => {
    if (!uniques.includes(proxy as string)) {
        uniques.push(proxy as string)
    }
    return uniques;
}, []);

export const RATE_LIMIT_PERIOD: number = 1000; // ms

export const DATASTORE_FOLDER: string = 'datastore';
export const ITEM_DB_NAME = 'items.json';

const BASE_WEEK_START: number = 1599248196557;
export const CRAWL_WEEK_START: number = (() => {
    // Calculate first week start 365 days ago as a multiple of BASE_WEEK_START so that filenames match in datastore
    const oneYearAgo = Date.now() - 365 * 24 * 60 * 60 * 1000;
    let weekStart = BASE_WEEK_START;
    while (weekStart - WEEK_TIMELAPSE >= oneYearAgo) {
        weekStart -= WEEK_TIMELAPSE
    }
    return weekStart;
})();
