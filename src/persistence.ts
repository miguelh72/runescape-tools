import fs from 'fs';
import parse from 'node-html-parser';
import { DATASTORE_FOLDER, ITEM_DB_NAME } from "./settings";
import { HtmlPage, ItemCategory, Skill } from './types';
import { error, isValidUrl, validateItemChild } from "./utils";

const NOT_ENOUGH_PLAYERS_FILENAME = 'not_enough_players.txt';

const _notEnoughPlayersURLs = loadNotEnoughPlayersURLList();

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
    if (!isValidUrl(url)) { throw new RangeError('URL is not valid.'); }

    return _notEnoughPlayersURLs.includes(url);
}

/**
 * Save url to list of endpoints without enough players to produce result.
 * @param url Url to be saved.
 */
function saveEndpointWithoutEnoughPlayers(url: string): void {
    if (!isValidUrl(url)) { throw new RangeError('URL is not valid.'); }

    _notEnoughPlayersURLs.push(url);
    saveNotEnoughPlayersURLList();
}

/**
 * Create valid filename from URL.
 * @param url URL to derive filename from.
 */
function getFilenameFromURL(url: string): string {
    if (!isValidUrl(url)) { throw new RangeError('URL is not valid.'); }

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
    if (!isValidUrl(url)) { throw new RangeError('URL is not valid.'); }

    return fs.existsSync(getFilepathFromUrl(url));
}

/**
 * Save HTML to storage.
 * @param htmlPage HtmlPage to be saved to storage.
 */
function saveHtmlPage(htmlPage: HtmlPage): void {
    if (htmlPage.html === undefined || typeof htmlPage.html !== 'string' || htmlPage.url === undefined || typeof htmlPage.url !== 'string') {
        throw new TypeError('htmlPage must implement HtmlPage interface.');
    }

    const filepath = getFilepathFromUrl(htmlPage.url);
    fs.writeFileSync(filepath, htmlPage.html);
}

/**
 * Retrieve an exp gain HTML page from storage.
 * @param url URL for which to retrieve exp gain HTML page for.
 */
function getExpGainPageFromUrl(url: string): HtmlPage | null {
    if (!isValidUrl(url)) { throw new RangeError('URL is not valid.'); }

    const filepath = getFilepathFromUrl(url);
    if (!fs.existsSync(filepath)) {
        return null;
    } else {
        const html = fs.readFileSync(filepath, 'utf8');
        return { url, html };
    }
}

/**
 * Verify integrity of data storage directory.
 */
async function verifyDatabaseIntegrity() {
    // Verify no invalid subdirectories
    const directories = fs.readdirSync(DATASTORE_FOLDER);
    const exceptions = [NOT_ENOUGH_PLAYERS_FILENAME];
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
        const isProperFile = parse(files[index]).querySelector('div.tableWrap') !== null;

        if (!isProperFile) {
            console.log(error(`Incorrect file found at path:\n${filePaths[index]}`));
            return false;
        }
    }
    return true;
}

/**
 * Validate interfaces of an ItemCategory array. Throws errors if objects dont match interface.
 * @param itemList ItemCategory[] to be validated.
 */
function validateItemCategoryArray(itemList: ItemCategory[]): void {
    if (!(itemList instanceof Array)) { throw new Error('Item list was not an array.'); }
    itemList.forEach(itemCategory => {
        if (typeof itemCategory.id !== 'number' || typeof itemCategory.name !== 'string' || !(itemCategory.items instanceof Array)) {
            throw new Error('ItemCategory did not match interface.');
        }
        itemCategory.items.forEach(item => {
            try {
                validateItemChild(item);
                if ((item as any).geCategory !== undefined) { throw new Error('item implemented Item interface instead of ItemCategoryChild interface.'); }
            } catch (err) {
                throw new Error('ItemCategoryChild did not match interface.' + err.message);
            }
        });
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

export default {
    isEndpointWithoutEnoughPlayers,
    saveEndpointWithoutEnoughPlayers,
    isInStorage,
    saveHtmlPage,
    getExpGainPageFromUrl,
    verifyDatabaseIntegrity,
    loadItemList,
    saveItemList
};
