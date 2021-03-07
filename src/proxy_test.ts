import Nightmare, { IConstructorOptions } from 'nightmare';
const ProxyList = require('proxy-sources');
import chalk from 'chalk';
import fs from 'fs';
import { IConstructorOptionsComplete } from './types';

let proxyList: string[] = fs.readFileSync('http_proxies.txt', 'utf8').split('\n').map(proxy => proxy.trim());

let i = 0;
(async () => {

    const pl = await ProxyList({ // TODO rm
        checker: true,
        timeout: 1000
    });
    console.log({ pl });
    proxyList = pl.list;

    for (const proxy of proxyList) {
        console.log(chalk.bold(`Testing proxy ${proxy} number ${i} in list`));
        i++;

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
            .goto('https://whatismyipaddress.com')
            .evaluate(() => {
                return (document.querySelector('#ipv4') as HTMLElement).textContent
            }
            )
            .end()
            .then((ip: string) => console.log(chalk.bold.green(ip)))
            .catch(_ => { }) // fail silently, proxy is not good
        //.catch((error: Error) => console.error('Something went wrong...', error));
    }
})();
