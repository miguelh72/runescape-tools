import fs from 'fs';
import readline from 'readline';
import chalk from 'chalk';
import Nightmare, { IConstructorOptions } from 'nightmare';
import { parse } from 'node-html-parser';
import { skill, timeframe, Skill, Timeframe } from './types';

interface IConstructorOptionsComplete extends IConstructorOptions {
    webPreferences?: any;
}

const DATASTORE_FOLDER = 'datastore';
const RATE_LIMIT_PERIOD = 1000; // ms
const DAY_TIMELAPSE = 86400000; // ms
const WEEK_TIMELAPSE = 604800000; // ms
const FIRST_WEEK_2020 = 1609523133037; // ms

const highscoreEndpoint = 'http://secure.runescape.com/m=hiscore/ranking?category_type=0';

const NUM_PROGRESS_BARS: number = 70;

const warning: chalk.Chalk = chalk.bold.yellow;
const result = chalk.bold.green;
const progress = chalk.bold.cyan;

/**
 * @returns True if running code in testing.
 */
export function isInTesting(): boolean {
    return process.env.JEST_WORKER_ID !== undefined;
}

/**
 * Show an updatable visual progress bar. You must not output anything else to console before the last time this function is called.
 * @param percentProgress Percent between 0 and 100, inclusively.
 * @throws RangeError
 */
function printProgress(percentProgress: number) {
    const numProgressBars = Math.round((percentProgress / 100) * NUM_PROGRESS_BARS);
    if (percentProgress > 100 || percentProgress < 0) {
        throw new RangeError('Percentage must be a value between 0 and 100, inclusively.');
    }

    if (!isInTesting()) {
        // If not in testing, output to console
        readline.clearLine(process.stdout, 0);
        readline.cursorTo(process.stdout, 0);
        process.stdout.write(progress(
            '|'
            + '|'.repeat(numProgressBars)
            + ((numProgressBars < NUM_PROGRESS_BARS) ? ' '.repeat(NUM_PROGRESS_BARS - numProgressBars) : '')
            + '|'
            + ' [' + Math.round(percentProgress) + '%]\t'
        ));
        if (percentProgress === 100) { console.log(); } // newline
    }
}

function getHighscoreURL(skill: Skill, timeframe: Timeframe, startTime: number, pgNum: number): string {
    return highscoreEndpoint + '&table=' + skill + '&time_filter=' + timeframe + '&date=' + startTime + '&page=' + pgNum;
}

function getHighscorePageset(skill: Skill, timeframe: Timeframe, startTime: number): string[] {
    return [1, 51, 101, 201, 301, 401, 501, 1001, 2001, 3001].map(pgNum => getHighscoreURL(skill, timeframe, startTime, pgNum));
}

function getFilenameFromURL(URL: string) {
    let filename = URL.replace('http://', '');
    filename = filename.replace('https://', '');
    filename = filename.replace(/[\/\.&?=#]/g, '_',);
    return filename + '.html';
}

function pause<T>(ms: number, ret?: T): Promise<T> {
    return new Promise(resolve => setTimeout(() => resolve((ret !== undefined) ? ret : (true as unknown) as T), ms));
}

async function loadPages(URLs: string[], subFolder?: string): Promise<Boolean> {
    if (!fs.existsSync(DATASTORE_FOLDER)) {
        fs.mkdirSync(DATASTORE_FOLDER);
    }
    let datastoreFolder = DATASTORE_FOLDER;
    if (subFolder !== undefined) {
        datastoreFolder += '/' + subFolder;
        if (!fs.existsSync(datastoreFolder)) {
            fs.mkdirSync(datastoreFolder);
        }
    }

    async function loadPage(URL: string): Promise<boolean> {
        const filename = datastoreFolder + '/' + getFilenameFromURL(URL);
        if (fs.existsSync(filename)) { return true; }

        let nightmare = new Nightmare({
            show: false, waitTimeout: 5000, loadImages: false,
            webPreferences: {
                images: false,
            }
        } as IConstructorOptionsComplete);
        return await nightmare
            .goto(URL)
            .wait('body')
            .html(filename, 'HTMLOnly')
            .evaluate(() => document.documentElement.outerHTML)
            .end()
            .then((response: string) => {
                return (parse(response).querySelector('div.tableWrap') === null) ? false : fs.existsSync(filename)
            })
            .then(result => pause(RATE_LIMIT_PERIOD, result));
    }

    let successful = true;
    for (let i = 0; i < URLs.length; i++) {
        printProgress(Math.round((i / URLs.length) * 100));
        let URL = URLs[i];
        successful = successful && (await loadPage(URL));
    }
    printProgress(100);

    return successful;
}

(async () => {
    const overallAlltimePages = getHighscorePageset(skill.overall, timeframe.alltime, new Date('01/01/2021').getTime());
    const result = await loadPages(overallAlltimePages, 'test');
    return { overallAlltimePages, result };
})().then(res => console.log(res));


//console.log(getFilenameFromURL('http://secure.runescape.com/m=hiscore/ranking?category_type=0&table=0&time_filter=0&date=1609477200000&page=1'));

// Request making using nightmare
/*
function getData(html: string) {
    let doc = parse(html);

    console.log({
        title: doc.querySelector('title').text,
        body: doc.querySelectorAll('div.tableWrap table')[1].querySelectorAll('tr').map((tr) => {
            return tr.querySelectorAll('td')[1].text.trim();
        }),
    });
}
*/