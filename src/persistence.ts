import { bold } from 'chalk';
import fs from 'fs';
import parse from 'node-html-parser';
import crawler from './crawler';
import { CRAWL_WEEK_START, DATASTORE_FOLDER, ITEM_DB_NAME } from "./settings";
import { ExpPage, HtmlPage, ItemCategory, Skill, Timeframe } from './types';
import { error, WEEK_TIMELAPSE } from "./utils";
import validate from './validate';

const NOT_ENOUGH_PLAYERS_FILENAME = 'not_enough_players.txt';

const _notEnoughPlayersURLs = loadNotEnoughPlayersURLList();

const _expPages: ExpPage[][][] = loadExpPages(); // Index by [Timeframe][Skill][Nonspecific page ordering in list]

function loadExpPages(): ExpPage[][][] {
    const allExpPages: ExpPage[][][] = Array.from({ length: 3 }, () => []);
    for (let timeframe = 0; timeframe < 3; timeframe++) {
        for (let skill in Skill) {
            const skillNum: number = parseInt(skill);
            if (isNaN(skillNum)) { continue; }
            const filepath = getExpPagesFilepath(skillNum, timeframe);

            let expPages: ExpPage[] = []
            if (fs.existsSync(filepath)) {
                expPages = JSON.parse(fs.readFileSync(filepath, 'utf8'));
            }

            if (!(expPages instanceof Array)) { throw new TypeError(`Loaded ExpPage[] is not of type Array for file at ${filepath}.`); }
            allExpPages[timeframe][skillNum] = expPages;
        }
    }
    return allExpPages;
}

/**
 * Load list of url endpoints without enough players.
 */
function loadNotEnoughPlayersURLList(): string[] {
    const filePath = DATASTORE_FOLDER + '/' + NOT_ENOUGH_PLAYERS_FILENAME;
    return (fs.existsSync(filePath)) ? fs.readFileSync(filePath, 'utf8').split('\n') : [];
}

/**
 * Save list of url endpoints without enough players.
 */
function saveNotEnoughPlayersURLList(): void {
    const listWithoutRepeats: string[] = [];
    _notEnoughPlayersURLs.forEach(url => {
        if (!listWithoutRepeats.includes(url)) {
            listWithoutRepeats.push(url);
        }
    });
    const filePath = DATASTORE_FOLDER + '/' + NOT_ENOUGH_PLAYERS_FILENAME;
    fs.writeFileSync(filePath, listWithoutRepeats.join('\n'));
}

/**
 * Check if url is an endpoint that has been previously encountered and does not contain enough players.
 * @param url Url to be checked.
 */
function isEndpointWithoutEnoughPlayers(url: string): boolean {
    validate.url(url);

    return _notEnoughPlayersURLs.includes(url);
}

/**
 * Save url to list of endpoints without enough players to produce result.
 * @param url Url to be saved.
 */
function saveEndpointWithoutEnoughPlayers(url: string): void {
    validate.url(url);

    _notEnoughPlayersURLs.push(url);
    saveNotEnoughPlayersURLList();
}

/**
 * Create valid filename from URL.
 * @param url URL to derive filename from.
 */
function getFilenameFromURL(url: string): string {
    validate.url(url);

    let filename = url.replace('http://', '');
    filename = filename.replace('https://', '');
    filename = filename.replace(/[\/\.&?=#]/g, '_',);
    return filename + '.html';
}

/**
 * Get complete filepath to storage file for URL.
 * @param url URL to derive filepath from.
 */
function getFilepathFromUrl(url: string): string {
    validate.url(url);

    let subFolder: string | undefined;
    if (url.includes('runescape.com/m=hiscore')) {
        const tableStartIndex = url.indexOf('&table=') + 7;
        if (tableStartIndex === -1) { throw new Error('URL does not contain table parameter'); }
        const tableEndIndex = url.indexOf('&time_filter=');
        if (tableEndIndex === -1) { throw new Error('URL does not contain time_filter parameter'); }
        subFolder = Skill[parseInt(url.slice(tableStartIndex, tableEndIndex))];
    }
    const datastoreFolder = DATASTORE_FOLDER + ((subFolder) ? '/' + subFolder : '');

    const filename = getFilenameFromURL(url);
    return datastoreFolder + '/' + filename;
}

/**
 * Check if HtmlPage exists in storage.
 * @param url URL to check if HtmlPage exists in storage.
 */
function isInStorage(url: string): boolean {
    validate.url(url);

    return fs.existsSync(getFilepathFromUrl(url));
}

/**
 * Save HTML to storage.
 * @param htmlPage HtmlPage to be saved to storage.
 */
function saveHtmlPage(htmlPage: HtmlPage): void {
    validate.htmlPage(htmlPage);

    const filepath = getFilepathFromUrl(htmlPage.url);
    fs.writeFileSync(filepath, htmlPage.html);
}

/**
 * Retrieve an exp gain HTML page from storage.
 * @param url URL for which to retrieve exp gain HTML page for.
 */
function getExpGainPageFromUrl(url: string): HtmlPage | null {
    validate.url(url);

    const filepath = getFilepathFromUrl(url);
    if (!fs.existsSync(filepath)) {
        return null;
    } else {
        const html = fs.readFileSync(filepath, 'utf8');
        return { url, html };
    }
}

/**
 * Validate interfaces of an ItemCategory array. Throws errors if objects dont match interface.
 * @param itemList ItemCategory[] to be validated.
 */
function validateItemCategoryArray(itemList: ItemCategory[]): void {
    if (!(itemList instanceof Array)) { throw new Error('Item list was not an array.'); }
    itemList.forEach(itemCategory => {
        validate.itemCategory(itemCategory)
    });
}

/**
 * Load available Grand Exchange item list from storage.
 */
function loadItemList(): ItemCategory[] {
    if (fs.existsSync(ITEM_DB_NAME)) {
        const itemList: ItemCategory[] = JSON.parse(fs.readFileSync(ITEM_DB_NAME, 'utf8'));
        validateItemCategoryArray(itemList);
        return itemList;
    } else {
        return [];
    }
}

/**
 * Store the item list to persistent storage.
 * @param itemList ItemCategory[] the item list to be stored.
 */
function saveItemList(itemList: ItemCategory[]) {
    validateItemCategoryArray(itemList);
    fs.writeFileSync(ITEM_DB_NAME, JSON.stringify(itemList));
}

// TODO remove later
function convertToExpPageSystem() {
    const HIGHSCORE_ENDPOINT: string = 'http://secure.runescape.com/m=hiscore/ranking?category_type=0';
    const HIGHSCORE_PAGENUMS_TO_SEARCH: number[] = [1, 51, 101, 201, 301, 401, 501, 1001, 2001, 3001];
    function getTimestampFromUrl(url: string): number {
        validate.url(url);

        let dateStartIndex = url.indexOf('&date=');
        if (dateStartIndex === -1) { throw new Error('URL does not contain date parameter'); }
        dateStartIndex += 6;
        const dateEndIndex = url.indexOf('&page=');
        if (dateEndIndex === -1) { throw new Error('URL does not contain page parameter'); }
        return parseInt(url.slice(dateStartIndex, dateEndIndex));
    }
    function getPageNumberFromUrl(url: string): number {
        validate.url(url);

        let pageNumStartIndex = url.indexOf('&page=');
        if (pageNumStartIndex === -1) { throw new Error('URL does not contain page parameter'); }
        pageNumStartIndex += 6;
        return parseInt(url.slice(pageNumStartIndex, url.length));
    }
    function getSkillFromUrl(url: string): Skill {
        validate.url(url);

        let tableStartIndex = url.indexOf('&table=');
        if (tableStartIndex === -1) { throw new Error('URL does not contain table parameter'); }
        tableStartIndex += 7;
        const tableEndIndex = url.indexOf('&time_filter=');
        if (tableEndIndex === -1) { throw new Error('URL does not contain time_filter parameter'); }
        return parseInt(url.slice(tableStartIndex, tableEndIndex));
    }
    function geSkillHighscoreUrlSet(skill: Skill, timeframe: Timeframe, startTime: number): string[] {
        validate.skill(skill);
        validate.timeframe(timeframe);
        if (startTime < new Date('01/01/2010').getTime()) { throw new RangeError('Start time must UNIX time in ms after the year 2010.') }

        return HIGHSCORE_PAGENUMS_TO_SEARCH
            .map(pgNum => `${HIGHSCORE_ENDPOINT}&table=${skill}&time_filter=${timeframe}&date=${startTime}&page=${pgNum}`);
    }
    function getNotEnoughPlayersExpPage(url: string): ExpPage {
        validate.url(url);

        const periodStart: number = getTimestampFromUrl(url);
        const pageNum: number = getPageNumberFromUrl(url);
        return { url, exp: 0, periodStart, pageNum, hasData: false };
    }
    function getPageTotalExp(page: HtmlPage): number {
        validate.htmlPage(page);
        if (!crawler.isValidExpGainPage(page)) { throw new TypeError('Page must be a valid highscore experience gain page.'); }

        return parse(page.html)
            .querySelectorAll('div.tableWrap table')[1]
            .querySelectorAll('tr')
            .map((tr) => parseInt(tr.querySelectorAll('td')[2].text.trim().replace(/[,]/g, '')))
            .reduce((sum, exp) => sum + exp);
    }
    function getExpPage(htmlPage: HtmlPage): ExpPage {
        validate.htmlPage(htmlPage);

        const periodStart: number = getTimestampFromUrl(htmlPage.url);
        const pageNum: number = getPageNumberFromUrl(htmlPage.url);
        const exp: number = getPageTotalExp(htmlPage);
        return { url: htmlPage.url, exp, periodStart, pageNum, hasData: true };
    }
    function getSkillWeeklyExpGainPages(skill: Skill): ExpPage[] {
        validate.skill(skill);

        const oneWeekBeforeToday = Date.now() - WEEK_TIMELAPSE;
        const weeksStartTime = [CRAWL_WEEK_START];
        while (weeksStartTime[weeksStartTime.length - 1] + WEEK_TIMELAPSE < oneWeekBeforeToday) {
            weeksStartTime.push(weeksStartTime[weeksStartTime.length - 1] + WEEK_TIMELAPSE);
        }
        const allWeeksHighscoreUrlSet = weeksStartTime.reduce((pages: string[], weekStartTime: number): string[] =>
            pages.concat(geSkillHighscoreUrlSet(skill, Timeframe.weekly, weekStartTime)), []);
        allWeeksHighscoreUrlSet.forEach(url => {
            // Confirm all files are loaded
            if (!isEndpointWithoutEnoughPlayers(url) && !isInStorage(url)) {
                throw new Error(`URL ${url} was not in storage.\nExpected filepath ${getFilepathFromUrl(url)}`);
            }
            if (isEndpointWithoutEnoughPlayers(url) && isInStorage(url)) {
                throw new Error(`URL ${url} was both in storage and in not enough players list.\nExpected filepath ${getFilepathFromUrl(url)}`);
            }
        });

        const expPages: ExpPage[] = [];
        allWeeksHighscoreUrlSet.forEach(url => {
            if (isEndpointWithoutEnoughPlayers(url)) {
                expPages.push(getNotEnoughPlayersExpPage(url));
            } else {
                const htmlPage = getExpGainPageFromUrl(url);
                if (htmlPage === null) { throw new Error('Returned page was null.'); }
                expPages.push(getExpPage(htmlPage));
            }
        });
        expPages.forEach(expPage => validate.expPage(expPage));
        return expPages;
    }

    for (let skill in Skill) {
        const skillNum: number = parseInt(skill);
        if (isNaN(skillNum)) { continue; }
        console.log('\nConverting experience gain data for skill: ' + bold(Skill[skillNum]));
        const skillExpPages: ExpPage[] = getSkillWeeklyExpGainPages(skillNum);
        const filepath = getExpPagesFilepath(skillNum, Timeframe.weekly);
        fs.writeFileSync(filepath, JSON.stringify(skillExpPages));
    }
}

/**
 * Generate storage filepath to JSON file storing ExpPage[] for particular Skill and Timeframe combination.
 * @param skill Skill enum
 * @param timeframe Timeframe enum
 */
function getExpPagesFilepath(skill: Skill, timeframe: Timeframe): string {
    validate.skill(skill);
    validate.timeframe(timeframe);

    return `${DATASTORE_FOLDER}/exp_gain_${Timeframe[timeframe]}_${Skill[skill]}.json`;
}

/**
 * Verify integrity of data storage directory.
 */
async function verifyDatabaseIntegrity() {
    // Verify no invalid subdirectories
    const directories = fs.readdirSync(DATASTORE_FOLDER);
    const exceptions = [
        NOT_ENOUGH_PLAYERS_FILENAME,
        NOT_ENOUGH_PLAYERS_FILENAME.slice(0, NOT_ENOUGH_PLAYERS_FILENAME.length - 4) + '_backup.txt'
    ];
    for (let skill = 0; skill < 29; skill++) {
        for (let timeframe = 0; timeframe < 3; timeframe++) {
            const filepath = getExpPagesFilepath(skill, timeframe);
            exceptions.push(filepath.slice(DATASTORE_FOLDER.length + 1, filepath.length));
        }
    }
    for (let dir of directories) {
        if (Skill[dir as any] === undefined && !exceptions.includes(dir)) {
            console.log(error(`Invalid subdirectory (not named after skill): ${dir}`));
            return false;
        }
    }

    // Get list of valid files
    let filePaths: string[] = [];
    for (let skillName in Skill) {
        const directory = DATASTORE_FOLDER + '/' + skillName;
        if (fs.existsSync(directory)) {
            const fileNames = fs.readdirSync(directory).map(fileName => directory + '/' + fileName);
            filePaths = filePaths.concat(fileNames);
        }

    }
    const files: string[] = filePaths.map(filePath => fs.readFileSync(filePath, 'utf8'));

    // Verify html pages
    for (let index = 0; index < files.length; index++) {

        let isProperFile: boolean = false;
        try {
            validate.htmlPage({ url: 'http://www.valid.com', html: files[index] });
            isProperFile = parse(files[index]).querySelector('div.tableWrap') !== null;
        } catch (_) { }

        if (!isProperFile) {
            console.log(error(`Incorrect file found at path:\n${filePaths[index]}`));
            return false;
        }
    }
    return true;
}

export default {
    isEndpointWithoutEnoughPlayers,
    saveEndpointWithoutEnoughPlayers,
    isInStorage,
    saveHtmlPage,
    getExpGainPageFromUrl,
    verifyDatabaseIntegrity,
    loadItemList,
    saveItemList,
    convertToExpPageSystem
};
