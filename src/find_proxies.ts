import Nightmare from 'nightmare';
const ProxyList = require('proxy-sources');
import chalk from 'chalk';
import { IConstructorOptionsComplete } from './types';
import crawler from './crawler';

const url = 'https://secure.runescape.com/m=hiscore/ranking?category_type=0&table=0&time_filter=1&page=1';

async function getWorkingProxyList(): Promise<string[]> {
    const pl = await ProxyList({
        checker: true,
        timeout: 5000
    });
    console.log({ pl });
    let proxyList: string[] = pl.list;

    const workingProxyList: string[] = [];
    await Promise.all(proxyList.map(async (proxy, index) => {
        let nightmare = new Nightmare({
            switches: {
                'proxy-server': proxy,
                'ignore-certificate-errors': true
            },
            show: false,
            loadImages: false,
            webPreferences: { images: false }
        } as IConstructorOptionsComplete);

        return await nightmare
            .goto(url)
            .evaluate(() => document.documentElement.outerHTML)
            .end()
            .then((html: string) => {
                if (crawler.isValidExpGainPage({ url, html })) {
                    workingProxyList.push(proxy);
                    console.log(`Found ${chalk.green.bold(workingProxyList.length)} working proxies out of ${proxyList.length} proxies.`);
                }
            })
            .catch(_ => 'Failed') // fail silently, proxy is not working
    }));
    return workingProxyList;
}

(async () => {
    console.log(await getWorkingProxyList());
})();
