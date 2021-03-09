import { IConstructorOptions } from "nightmare";

/**
 * Skill enumeration. Value is table number for endpoint calls.
 */
export enum Skill {
    overall = 0,
    attack,
    defense,
    strength,
    constitution,
    ranged,
    prayer,
    magic,
    cooking,
    woodcutting,
    fletching,
    fishing,
    firemaking,
    crafting,
    smithing,
    mining,
    herblore,
    agility,
    thieving,
    slayer,
    farming,
    runecrafting,
    hunter,
    construction,
    summoning,
    dungeoneering,
    divination,
    invention,
    archaeology,
}

/**
 * Timeframe enumeration for enpoint calls.
 */
export enum Timeframe {
    alltime = 0,
    weekly,
    monthly,
}

/**
 * Extension of @types/nightmare IConstructorOptions to include missing parameters.
 */
export interface IConstructorOptionsComplete extends IConstructorOptions {
    webPreferences?: any;
    switches?: any,
}

/**
 * Full HTML page as a string.
 */
export interface HtmlPage {
    url: string,
    html: string,
}

/**
 * Extracted highscore experience gain page.
 */
export interface ExpPage {
    url: string,
    exp: number,
    periodStart: number,
    pageNum: number
}

/**
 * Grand exchange item without category to allow for more efficient database storage.
 */
export interface ItemCategoryChild {
    id: number,
    name: string,
    description: string,
    members: boolean
}

/**
 * Grand Exchange item.
 */
export interface Item extends ItemCategoryChild {
    geCategory: { id: number, name: string },
}

/**
 * Grand exchange item category.
 */
export interface ItemCategory {
    id: number,
    name: string,
    items: ItemCategoryChild[]
}