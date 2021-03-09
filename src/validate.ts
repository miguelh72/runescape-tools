import { ExpPage, HtmlPage, Item, ItemCategory, ItemCategoryChild, Skill, Timeframe } from "./types";

/**
 * Validate a Skill parameter.
 * @param skill Skill enum to be validated.
 * @throws TypeError thrown if Skill is not valid.
 */
function skill(skill: Skill): void {
    if (typeof skill !== 'number') { throw new TypeError('Skill should be of type number. Make sure you are using Skill enum.'); }
    if (skill < 0 || skill > 28) { throw new TypeError('Skill should be greater than or equal to 0 and less than or equal to 28. Make sure you are using Skill enum.'); }
}

/**
 * Validate a Timeframe parameter.
 * @param timeframe Timeframe enum to be validated.
 * @throws TypeError thrown if Timeframe is not valid.
 */
function timeframe(timeframe: Timeframe): void {
    if (typeof timeframe !== 'number') { throw new TypeError('Timeframe should be of type number. Make sure you are using Timeframe enum.'); }
    if (timeframe < 0 || timeframe > 2) { throw new TypeError('Timeframe should be greater than or equal to 0 and less than or equal to 2. Make sure you are using Timeframe enum.'); }
}

/**
 * Validate a url parameter.
 * @param url Url address to be validated.
 * @throws TypeError thrown if url is not valid.
 */
function url(url: string): void {
    if (typeof url !== 'string') { throw new TypeError('URL must be a string.'); }
    if (!/^(?:(?:(?:https?|ftp):)?\/\/)(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))(?::\d{2,5})?(?:[/?#]\S*)?$/i.test(url)) {
        throw new TypeError('URL is not in a valid format.');
    }
}

/**
 * Validate an HtmlPage against its interface.
 * @param htmlPage HtmlPage to be validated.
 * @throws TypeError thrown if HtmlPage is not valid.
 */
function htmlPage(htmlPage: HtmlPage): void {
    if (typeof htmlPage.url !== 'string' || typeof htmlPage.html !== 'string') { throw new TypeError('HtmlPage did not match interface structure.'); }
    try {
        url(htmlPage.url);
    } catch (_) {
        throw new TypeError('HtmlPage url is not in a valid format.');
    }
    if (!/<!doctype html>[\s\S]*<html[\s\S]*<body[\s\S]*<\/body[\s\S]*<\/html/i.test(htmlPage.html)) {
        throw new TypeError('HtmlPage html is not valid HTML.');
    }
}

/**
 * Validate an ExpPage against its interface.
 * @param expPage ExpPage to be validated.
 * @throws TypeError thrown if ExpPage is not valid.
 */
function expPage(expPage: ExpPage): void {
    if (typeof expPage.url !== 'string'
        || typeof expPage.exp !== 'number'
        || typeof expPage.periodStart !== 'number'
        || typeof expPage.pageNum !== 'number') {
        throw new TypeError('ExpPage did not match interface structure');
    }
    try {
        url(expPage.url);
    } catch (_) {
        throw new TypeError('ExpPage url is not in a valid format.');
    }
}

/**
 * Validate an ItemCategoryChild against its interface.
 * @param itemCategoryChild ItemCategoryChild to be validated.
 * @throws TypeError thrown if ItemCategoryChild is not valid.
 */
function itemCategoryChild(itemCategoryChild: ItemCategoryChild): void {
    if (typeof itemCategoryChild.id !== 'number'
        || typeof itemCategoryChild.name !== 'string'
        || typeof itemCategoryChild.description !== 'string'
        || typeof itemCategoryChild.members !== 'boolean') {
        throw new TypeError('ItemCategoryChild did not match interface structure.');
    }
}

/**
 * Validate an Item against its interface.
 * @param item Item to be validated.
 * @throws TypeError thrown if Item is not valid.
 */
function item(item: Item): void {
    try {
        itemCategoryChild(item);
    } catch (_) {
        throw new TypeError('Item did not match interface structure.');
    }
    if (item.geCategory === undefined || typeof item.geCategory.id !== 'number' || typeof item.geCategory.name !== 'string') {
        throw new TypeError('Item geCategory did not match interface structure.');
    }
}

/**
 * Validate ItemCategory against its interface.
 * @param itemCategory ItemCategory to be validated.
 * @throws TypeError thrown if ItemCategory is not valid.
 */
function itemCategory(itemCategory: ItemCategory): void {
    if (typeof itemCategory.id !== 'number' || typeof itemCategory.name !== 'string' || !(itemCategory.items instanceof Array)) {
        throw new TypeError('ItemCategory did not match interface structure.');
    }
    try {
        itemCategory.items.forEach(item => {
            itemCategoryChild(item);
        });
    } catch (_) {
        throw new TypeError('ItemCategoryChild of ItemCategory did not match its interface structure.');
    }
}

// TODO add proxy validation function

/**
 * Validation module. We follow ideology that when a parameter is not of correct type, this is a semantic error, and a TypeError will be thrown.
 * To save computation time, only a module's public function or when data is loaded from external resource require validation.
 */
export default {
    skill,
    timeframe,
    url,
    htmlPage,
    expPage,
    itemCategoryChild,
    item,
    itemCategory,
};