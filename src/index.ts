import fs from 'fs';
import readline from 'readline';
import chalk from 'chalk';
import Nightmare, { IConstructorOptions } from 'nightmare';
import { parse } from 'node-html-parser';
import { skill, timeframe, Skill, Timeframe, getSkillName, KeyValueSet } from './types';

interface IConstructorOptionsComplete extends IConstructorOptions {
    webPreferences?: any;
}

/**
 * Error class for when server responds with critical error while attempting to load resource.
 */
export class ServersideException extends Error {
    public code: string;

    /**
     * @param message The error's message to developer.
     * @param code Code used to denote different errors.
     */
    constructor(message: string, code?: string) {
        super(message);

        // Maintains proper stack trace for where our error was thrown (only available on V8)
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, ServersideException);
        }

        this.name = 'ServersideException';
        this.code = code || 'SSE';
    }
}

const DATASTORE_FOLDER = 'datastore';
const NOT_ENOUGH_PLAYERS_URLS = 'not_enough_players_urls.txt';
const RATE_LIMIT_PERIOD = 1000; // ms
const MAX_RETRIES = 3; // number of retries per URL
const DAY_TIMELAPSE = 86400000; // ms
const WEEK_TIMELAPSE = 604800000; // ms
const FIRST_WEEK_2020 = 1609529796557; // ms

const HIGHSCORE_ENDPOINT = 'http://secure.runescape.com/m=hiscore/ranking?category_type=0';

const NUM_PROGRESS_BARS: number = 70;

const error = chalk.bold.red;
const warning = chalk.bold.yellow;
const ok = chalk.bold.green;
const progress = chalk.bold.cyan;

// TODO fix badly codependent code of NotEnoughPlayers system
const NotEnoughPlayers = {
    _notEnoughPlayersURLs: loadNotEnoughPlayersURLList(),
    add: (URL: string) => {
        NotEnoughPlayers._notEnoughPlayersURLs.push(URL);
        saveNotEnoughPlayersURLList();
    },
    contains: (URL: string) => NotEnoughPlayers._notEnoughPlayersURLs.includes(URL)
}
function loadNotEnoughPlayersURLList(): string[] {
    const filePath = DATASTORE_FOLDER + '/' + NOT_ENOUGH_PLAYERS_URLS;
    if (fs.existsSync(filePath)) {
        return fs.readFileSync(filePath, 'utf8').split('\n');
    } else {
        return [];
    }
}
function saveNotEnoughPlayersURLList(): boolean {
    try {
        const filePath = DATASTORE_FOLDER + '/' + NOT_ENOUGH_PLAYERS_URLS;
        fs.writeFileSync(filePath, NotEnoughPlayers._notEnoughPlayersURLs.join('\n'));
        return true;
    } catch (err) {
        console.log(error(err));
        return false;
    }
}

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
function printProgress(percentProgress: number): void {
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
    return HIGHSCORE_ENDPOINT + '&table=' + skill + '&time_filter=' + timeframe + '&date=' + startTime + '&page=' + pgNum;
}

function getHighscorePageSet(skill: Skill, timeframe: Timeframe, startTime: number): string[] {
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

async function loadSinglePage(URL: string, datastoreFolder?: string, rateLimitPeriod: number = RATE_LIMIT_PERIOD): Promise<boolean> {
    const filename = getFilenameFromURL(URL);
    const filepath = (datastoreFolder !== undefined) ? datastoreFolder + '/' + filename : filename;
    if (fs.existsSync(filepath) || NotEnoughPlayers.contains(URL)) { return true; }

    let result = { done: false, value: false };
    for (let retry = 0; !result.done && retry <= MAX_RETRIES; retry++) {
        const response: string = await new Nightmare({
            show: false,
            loadImages: false,
            webPreferences: { images: false }
        } as IConstructorOptionsComplete)
            .goto(URL)
            .wait('body')
            .html(filepath, 'HTMLOnly')
            .evaluate(() => document.documentElement.outerHTML)
            .end()
            .then((response: string) => response)
            .catch((err: Error) => {
                console.log(error(err));
                return 'ElectronUnknownError \n' + err.name + '\n' + err.message;
            });

        if (!response.includes('ElectronUnknownError')) {
            result.done = true;
            if (response.includes('Sorry, there are currently no players to display')) {
                NotEnoughPlayers.add(URL);
                console.log(warning('\nThere were not enough players at URL:\n' + URL));
                result.value = true;
                if (fs.existsSync(filepath)) {
                    fs.rmSync(filepath);
                }
            } else if (parse(response).querySelector('div.tableWrap') !== null) {
                result.value = fs.existsSync(filepath);
            }
        } else {
            console.log(error(response));
        }
        if (!result.value && fs.existsSync(filepath)) {
            fs.rmSync(filepath);
        }

        await pause(rateLimitPeriod);
    }

    if (!result.done) {
        console.log(error('\nServer responded with critical error at URL:\n' + URL));
    }
    return result.value;
}

async function loadPages(URLs: string[], subFolder?: string, rateLimitPeriod?: number): Promise<boolean> {
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

    const result: boolean[] = [];
    for (let i = 0; i < URLs.length; i++) {
        printProgress(Math.round((i / URLs.length) * 100));
        let URL = URLs[i];
        result.push(await loadSinglePage(URL, datastoreFolder, rateLimitPeriod));
    }
    const successful = result.reduce((acc, res) => acc && res);
    if (successful) { printProgress(100); }

    return successful;
}

async function loadSkill(sk: Skill, rateLimitPeriod?: number): Promise<boolean> {
    if (sk === undefined || sk < 0 || sk > 28) { throw new RangeError('Skill must be a numerical value between 0 and 28, inclusively.'); }

    const oneWeekBeforeToday = Date.now() - WEEK_TIMELAPSE;
    const startOfWeeks = [FIRST_WEEK_2020];
    while (startOfWeeks[startOfWeeks.length - 1] + WEEK_TIMELAPSE < oneWeekBeforeToday) {
        startOfWeeks.push(startOfWeeks[startOfWeeks.length - 1] + WEEK_TIMELAPSE);
    }

    const pages = startOfWeeks.reduce((acc: string[], weekStart: number) =>
        acc.concat(getHighscorePageSet(sk, timeframe.weekly, weekStart)), []);

    return loadPages(pages, getSkillName(sk), rateLimitPeriod);
}

async function update(sk: Skill, rateLimitPeriod?: number): Promise<boolean> {
    const skillName = getSkillName(sk as Skill);
    console.log('Working on skill: ' + chalk.bold(skillName));
    return loadSkill(sk, rateLimitPeriod).then(result => {
        if (!result) { console.log(error(`\nFailed to update ${skillName} skill.`)) }
        return result;
    });
}

async function updateAll(rateLimitPeriod?: number): Promise<boolean> {
    const results: boolean[] = [];
    for (const [_, skillNum] of Object.entries(skill)) {
        results.push(await update(skillNum, rateLimitPeriod));
    }
    return results.reduce((acc, res) => acc && res);
}

async function verifyDatabaseIntegrity() {
    // Verify no invalid subdirectories
    const directories = fs.readdirSync(DATASTORE_FOLDER);
    const exceptions = [NOT_ENOUGH_PLAYERS_URLS];
    for (let dir of directories) {
        if ((skill as KeyValueSet<Skill>)[dir] === undefined && !exceptions.includes(dir)) {
            console.log(error(`Invalid subdirectory (not named after skill): ${dir}`));
            return false;
        }
    }

    // Get list of valid files
    let filePaths: string[] = [];
    for (let [skillName, _] of Object.entries(skill)) {
        const directory = DATASTORE_FOLDER + '/' + skillName;
        const fileNames = fs.readdirSync(directory).map(fileName => directory + '/' + fileName);
        filePaths = filePaths.concat(fileNames);
    }
    const files: string[] = filePaths.map(filePath => fs.readFileSync(filePath, 'utf8'));

    // Verify html pages
    for (let index = 0; index < files.length; index++) {
        const isProperFile = parse(files[index]).querySelector('div.tableWrap') !== null;

        if (!isProperFile) {
            console.log(error(`Incorrect file found at path:\n${filePaths[index]}`));
            return false;
        }
    }

    return true;
}

//(async () => console.log(await verifyDatabaseIntegrity()))();

//update(skill.runecrafting);


updateAll(5000)
    .then(async (loadedAll) => {
        if (await verifyDatabaseIntegrity()) {
            console.log(error('Datastore is not valid.'));
        }
        if (!loadedAll) {
            console.log(error('Could not update all skills.'));
        } else {
            console.log(ok('All skills are up to date.'));
        }
    });


/**
 * TODO list
 * - Take into account double exp weeks, full list available in wiki.
 */