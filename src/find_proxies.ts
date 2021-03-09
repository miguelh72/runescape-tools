import Nightmare from 'nightmare';
const ProxyList = require('proxy-sources');
import chalk from 'chalk';
import { IConstructorOptionsComplete } from './types';
import crawler from './crawler';

const url = 'https://secure.runescape.com/m=hiscore/ranking?category_type=0&table=0&time_filter=1&page=1';
const NUM_CHECKS = 2;

async function getWorkingProxyList(): Promise<string[]> {
    const pl = await ProxyList({
        checker: true,
        timeout: 10000
    });
    let proxyList: string[] = pl.list;
    console.log(chalk.bold(`Trying to find working proxies. Searching list of ${proxyList.length}`));

    let workingProxyList: string[] = [];
    await Promise.all(proxyList.map(async proxy => {
        let nightmare = new Nightmare({
            switches: {
                'proxy-server': proxy,
                'ignore-certificate-errors': true
            },
            show: false,
            loadImages: false,
            webPreferences: { images: false }
        } as IConstructorOptionsComplete);

        await nightmare
            .goto(url)
            .evaluate(() => document.documentElement.outerHTML)
            .end()
            .then((html: string) => {
                if (crawler.isValidExpGainPage({ url, html })) {
                    workingProxyList.push(proxy);
                }
            })
            .catch(_ => 'Failed') // fail silently, proxy is not working
    })).then(() => console.log(`Found ${chalk.green.bold(workingProxyList.length)} working proxies out of ${proxyList.length} proxies.`));

    for (let check = 0; check < NUM_CHECKS; check++) {
        const checkedWorkingProxyList: string[] = [];
        await Promise.all(workingProxyList.map(async proxy => {
            let nightmare = new Nightmare({
                switches: {
                    'proxy-server': proxy,
                    'ignore-certificate-errors': true
                },
                show: false,
                loadImages: false,
                webPreferences: { images: false }
            } as IConstructorOptionsComplete);

            await nightmare
                .goto(url)
                .evaluate(() => document.documentElement.outerHTML)
                .end()
                .then((html: string) => {
                    if (crawler.isValidExpGainPage({ url, html })) {
                        checkedWorkingProxyList.push(proxy);
                    }
                })
                .catch(_ => 'Failed') // fail silently, proxy is not working
        })).then(() => {
            console.log(`Refined to ${chalk.green.bold(checkedWorkingProxyList.length)} working proxies out of ${proxyList.length} proxies in ${check + 1} trial.`);
            workingProxyList = checkedWorkingProxyList;
        });
    }

    return workingProxyList;
}

(async () => {
    console.log(await getWorkingProxyList());
})();
