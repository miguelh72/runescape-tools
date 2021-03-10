import fs from 'fs';
import { DATASTORE_FOLDER } from "./settings";
import { ExpPage, ItemCategory, Skill, Timeframe } from './types';
import { error } from "./utils";
import validate from './validate';
import crawler from './crawler';

const ITEM_DB_NAME: string = 'items.json';

const _expPages: ExpPage[][][] = loadExpPages();

/**
 * Get Skill from URL string.
 * @param url URL string for highscore page.
 */
function getSkillFromHighscoreUrl(url: string): Skill {
    if (!url.includes(crawler.HIGHSCORE_ENDPOINT)) { throw new Error('URL is not for a highscore experience page.'); }

    let tableStartIndex = url.indexOf('&table=');
    if (tableStartIndex === -1) { throw new Error('URL does not contain table parameter'); }
    tableStartIndex += 7;
    const tableEndIndex = url.indexOf('&time_filter=');
    if (tableEndIndex === -1) { throw new Error('URL does not contain time_filter parameter'); }
    return parseInt(url.slice(tableStartIndex, tableEndIndex));
}

/**
 * Get Timeframe from URL string.
 * @param url URL string for highscore page.
 */
function getTimeframeFromHighscoreUrl(url: string): Timeframe {
    if (!url.includes(crawler.HIGHSCORE_ENDPOINT)) { throw new Error('URL is not for a highscore experience page.'); }

    let timeFilterStartIndex = url.indexOf('&time_filter=');
    if (timeFilterStartIndex === -1) { throw new Error('URL does not contain time_filter parameter'); }
    timeFilterStartIndex += '&time_filter='.length;
    const timeFilterEndIndex = url.indexOf('&date=');
    if (timeFilterEndIndex === -1) { throw new Error('URL does not contain date parameter'); }
    return parseInt(url.slice(timeFilterStartIndex, timeFilterEndIndex));
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
 * Load all ExpPage from storage. Result is indexed by [Timeframe][Skill][Nonspecific page ordering in list]
 */
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
 * Retrieve an ExpPage from storage. Null if page does not exist.
 * @param url URL for which to retrieve ExpPage for.
 */
function fetchExpPage(url: string): ExpPage | null {
    validate.url(url);

    const timeframe: Timeframe = getTimeframeFromHighscoreUrl(url);
    const skill: Skill = getSkillFromHighscoreUrl(url);

    const expPage = _expPages[timeframe][skill].find(expPage => expPage.url === url);
    return (expPage !== undefined) ? Object.assign({}, expPage) : null;
}

/**
 * Save ExpPage to storage.
 * @param expPage ExpPage to be saved to persistent storage.
 */
function saveExpPage(expPage: ExpPage): void {
    validate.expPage(expPage);

    const timeframe: Timeframe = getTimeframeFromHighscoreUrl(expPage.url);
    const skill: Skill = getSkillFromHighscoreUrl(expPage.url);

    const wasReplaced: boolean = _expPages[timeframe][skill].some((page: ExpPage, index: number): boolean => {
        if (page.url === expPage.url) {
            _expPages[timeframe][skill][index] = expPage;
            return true;
        }
        return false;
    });
    if (!wasReplaced) {
        _expPages[timeframe][skill].push(expPage);
    }

    fs.writeFileSync(getExpPagesFilepath(skill, timeframe), JSON.stringify(_expPages[timeframe][skill]))
}

/**
 * Validate interfaces of an ItemCategory array. Throws errors if objects dont match interface.
 * @param itemList ItemCategory[] to be validated.
 */
function validateItemCategoryArray(itemList: ItemCategory[]): void {
    if (!(itemList instanceof Array)) { throw new TypeError('Item list was not an array.'); }
    itemList.forEach(itemCategory => {
        validate.itemCategory(itemCategory)
    });
}

/**
 * Load available Grand Exchange item list from storage.
 */
function fetchItemList(): ItemCategory[] {
    const filepath = DATASTORE_FOLDER + '/' + ITEM_DB_NAME
    if (fs.existsSync(filepath)) {
        const itemList: ItemCategory[] = JSON.parse(fs.readFileSync(filepath, 'utf8'));
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

    fs.writeFileSync(DATASTORE_FOLDER + '/' + ITEM_DB_NAME, JSON.stringify(itemList));
}

/**
 * Verify integrity of data storage directory.
 */
async function verifyDatabaseIntegrity() {
    // Verify no invalid subdirectories
    const directories = fs.readdirSync(DATASTORE_FOLDER);
    const expected: string[] = ['archive', 'backup', ITEM_DB_NAME];
    for (let skill = 0; skill < 29; skill++) {
        for (let timeframe = 0; timeframe < 3; timeframe++) {
            const filepath = getExpPagesFilepath(skill, timeframe);
            expected.push(filepath.slice(DATASTORE_FOLDER.length + 1, filepath.length));
        }
    }
    for (let dir of directories) {
        if (!expected.includes(dir)) {
            console.log(error(`Invalid directory or file: ${dir}`));
            return false;
        }
    }

    return true;
}

export default {
    fetchItemList,
    saveItemList,
    fetchExpPage,
    saveExpPage,
    verifyDatabaseIntegrity,

    /**
     * Do not use these functions outside of testing.
     */
    __tests__: {
        ITEM_DB_NAME
    }
};
