export const PROXY_LIST: string[] = [
    '167.172.236.230:8080',
    '165.227.120.65:8080',
    '159.203.124.251:8080',
    '138.199.31.79:3128',
    '185.253.98.21:3128',
    '185.253.98.20:3128',
    '165.227.88.225:8080',
    '188.166.213.127:8080',
    '134.209.98.28:8080',
    '34.92.50.186:3128',
    '165.227.173.87:43891',
    '176.113.73.102:3128',
    '118.27.114.32:8080',
    '104.248.35.123:8888',
    '188.166.30.17:8888',
    '176.113.73.101:3128',
    '45.32.53.194:8080',
    '129.232.134.107:3128',
    '3.1.88.182:3128',
    undefined
].reduce((uniques: string[], proxy: string | undefined): string[] => {
    if (!uniques.includes(proxy as string)) {
        uniques.push(proxy as string)
    }
    return uniques;
}, []);

export const RATE_LIMIT_PERIOD: number = 1000; // ms

export const DATASTORE_FOLDER: string = 'datastore';

export const CRAWL_WEEK_START: number = 1599248196557; //1609529796557; // ms
