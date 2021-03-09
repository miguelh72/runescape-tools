import readline from 'readline';
import chalk, { Chalk } from "chalk";
import { Item, ItemCategoryChild } from './types';

const NUM_PROGRESS_BARS: number = 70;

export const DAY_TIMELAPSE: number = 86400000; // ms
export const WEEK_TIMELAPSE: number = 604800000; // ms

export const error: Chalk = chalk.bold.red;
export const warning: Chalk = chalk.bold.yellow;
export const ok: Chalk = chalk.bold.green;
export const progress: Chalk = chalk.bold.cyan;
export const bold: Chalk = chalk.bold;

export class TabularFunction {
    #f: number[];
    #x: number[];

    /**
     * Object for tabular function in 2D numerical space.
     * @param x Array of numbers representing independent variable.
     * @param f Array of numbers representing dependent variable.
     */
    constructor(f: number[] = [], x: number[] = []) {
        if (f !== undefined && x === undefined) { throw new RangeError('Both f and x must be specified.'); }
        if (!(f instanceof Array) || !(x instanceof Array)) { throw new TypeError('f and x must be number Array.'); }
        if (f.length !== x.length) { throw new RangeError('Length of f and x must match.'); }
        if (f.length > 0 && (typeof f[0] !== 'number' || typeof x[0] !== 'number')) { throw new TypeError('f and x must be Array of numbers.'); }

        this.#f = f;
        this.#x = x;
    }

    get f(): number[] {
        return this.#f;
    }

    get x(): number[] {
        return this.#x;
    }

    get length(): number {
        return this.#f.length;
    }

    /**
     * Add a point to the function. Datapoint will be placed in the series according to the independent variable's natural ordering.
     * @param fi Datapair's dependent value.
     * @param xi Datapair's independent value.
     */
    addDatapoint(fi: number, xi: number): void {
        if (typeof fi !== 'number' || typeof xi !== 'number') { throw new TypeError('f and x values must be numbers.'); }

        if (this.length === 0) {
            this.#f.push(fi);
            this.#x.push(xi);
            return;
        }
        if (xi < this.#x[0]) {
            this.#f.unshift(fi);
            this.#x.unshift(xi);
            return
        }
        for (let i = 1; i < this.#x.length; i++) {
            if (xi < this.#x[i]) {
                this.#f.splice(i, 0, fi);
                this.#x.splice(i, 0, xi);
                return;
            }
        }
        this.#f.push(fi);
        this.#x.push(xi);
    }

    /**
     * Concatenate two TabularFunction. Note this does not maintain independent variable's natural ordering.
     * @param fnTabular TabularFunction to be concatenated.
     */
    concat(fnTabular: TabularFunction): TabularFunction {
        if (!(fnTabular instanceof TabularFunction)) { throw new TypeError('Function must be of type TabularFunction to be concatenated with a TabularFunction.'); }

        return new TabularFunction(this.#f.concat(fnTabular.f), this.#x.concat(fnTabular.x));
    }

    /**
     * Obtain new TabularFunction with slice of data. 
     * @param from Index to start slice, inclusively.
     * @param to Index to stop slice, exclusively.
     */
    slice(from: number, to: number = this.length): TabularFunction {
        if (typeof from !== 'number' || typeof to !== 'number') { throw new TypeError('from and to index must be of type number.'); }
        if (from < 0 || from > ((this.length !== 0) ? this.length - 1 : 0)) { throw new RangeError('from index out of bounds.'); }
        if (to < from || to < 0 || to > this.length) { throw new RangeError('to index out of bounds.'); }

        return new TabularFunction(this.#f.slice(from, to), this.#x.slice(from, to));
    }

    /**
     * Calculate definite integral of TabularFunction.
     * @param from Index of lower integration limit, inclusviely.
     * @param to Index of upper integration limit, exclusively.
     */
    integrate(from: number = 0, to: number = this.length): number {
        if (typeof from !== 'number' || typeof to !== 'number') { throw new TypeError('from and to index must be of type number.'); }
        if (from < 0 || from > ((this.length !== 0) ? this.length - 1 : 0)) { throw new RangeError('from index out of bounds.'); }
        if (to < from || to < 0 || to > this.length) { throw new RangeError('to index out of bounds.'); }
        for (let i = 0; i < this.#x.length - 1; i++) {
            if (this.#x[i] > this.#x[i + 1]) { throw new Error('Independent variable does not have natural ordering. Was this TabularFunction made using concat method?'); }
        }

        const integrationSection = this.slice(from, to);
        return integrate(integrationSection.f, integrationSection.x);
    }

    toString(): string {
        return `TabularFunction {
    x: [${this.#x.join(', ')}],
    f: [${this.#f.join(', ')}]
}`;
    }
}

/**
 * @returns True if running code in Jest testing.
 */
export function isInTesting(): boolean {
    return process.env.JEST_WORKER_ID !== undefined;
}

/**
 * Show an updatable visual progress bar. You must not output anything else to console before the last time this function is called.
 * @param percentProgress Percent between 0 and 100, inclusively.
 * @throws RangeError
 */
export function printProgress(percentProgress: number): void {
    if (percentProgress > 100 || percentProgress < 0) {
        throw new RangeError('Percentage must be a value between 0 and 100, inclusively.');
    }

    if (!isInTesting()) {
        const numProgressBars = Math.round((percentProgress / 100) * NUM_PROGRESS_BARS);
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
    }
}

/**
 * Generate a promise that returns after a set time with a specified return value, or undefined by default. Used to pause execution.
 * @param ms Time to pause for in milliseconds.
 * @param ret Object to return after time has elapsed. Returns undefined by default.
 */
export function pause<T>(ms: number, ret?: T): Promise<T | undefined> {
    if (typeof ms !== 'number') { throw new TypeError('Time must be of time number.'); }
    if (ms < 0) { throw new TypeError('Time must be greater than or equal to zero.'); }

    return new Promise(resolve => setTimeout(() => resolve(ret), ms));
}

/**
 * Numerical definite integration by trapezoid method.
 * @param f Function series, y-axis values corresponding to f(x_i). f must not be empty.
 * @param x Domain series, x-axis values
 * @param fo Value of f at lower bound of integration
 */
export function integrate(f: number[], x?: number[], fo?: number): number {
    if (!(f instanceof Array)) { throw new TypeError('f is not an instance of an Array'); }
    if (f.length === 0) { return (fo !== undefined) ? fo : 0; }
    if (typeof f[0] !== 'number') { throw new TypeError('f is not an Array of numbers'); }
    if (x !== undefined) {
        if (!(x instanceof Array)) { throw new TypeError('x is not an instance of an Array'); }
        if (typeof x[0] !== 'number') { throw new TypeError('x is not an Array of numbers'); }
        if (f.length !== x.length) { throw new RangeError('f and x must have the same length'); }
    } else {
        x = Array.from({ length: f.length }, (_, i: number) => i);
    }

    let result = (fo !== undefined) ? fo : 0;
    for (let step = 0; step < f.length - 1; step++) {
        result += 0.5 * (f[step + 1] + f[step]) * (x[step + 1] - x[step]);
    }
    return result;
}

/**
 * Validate a url parameter.
 * @param url Url address to be validated.
 */
export function isValidUrl(url: string) {
    if (typeof url !== 'string') { throw new TypeError('URL must be a string.'); }

    return /^(?:(?:(?:https?|ftp):)?\/\/)(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))(?::\d{2,5})?(?:[/?#]\S*)?$/i.test(url);
}

/**
 * Validate a storage Grand Exchange item to adhere to ItemCategoryChild interface. Throws errors if not valid.
 * @param item ItemCategoryChild to be validated. These are the items stored by persistence module.
 */
export function validateItemChild(item: ItemCategoryChild): void {
    if (item.id === undefined) { throw new TypeError('Item id is undefined.'); }
    if (typeof item.id !== 'number') { throw new TypeError('Item id is not of type number.'); }

    if (item.name === undefined) { throw new TypeError('Item name is undefined.'); }
    if (typeof item.name !== 'string') { throw new TypeError('Item name is not of type string.'); }

    if (item.description === undefined) { throw new TypeError('Item description is undefined.'); }
    if (typeof item.description !== 'string') { throw new TypeError('Item description is not of type string.'); }

    if (item.members === undefined) { throw new TypeError('Item members is undefined.'); }
    if (typeof item.members !== 'boolean') { throw new TypeError('Item members is not of type boolean.'); }
}

/**
 * Validate a Grand Exchange item to adhere to Item interface. Throws errors if not valid.
 * @param item Item to be validated.
 */
export function validateItem(item: Item): void {
    validateItemChild(item);
    if (item.geCategory === undefined) { throw new TypeError('Item geCategory is undefined.'); }
    if (item.geCategory.id === undefined) { throw new TypeError('Item geCategory.id is undefined.'); }
    if (typeof item.geCategory.id !== 'number') { throw new TypeError('Item geCategory.id is not of type number.'); }
    if (item.geCategory.name === undefined) { throw new TypeError('Item geCategory.name is undefined.'); }
    if (typeof item.geCategory.name !== 'string') { throw new TypeError('Item geCategory.name is not of type string.'); }
}
