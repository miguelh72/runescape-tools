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