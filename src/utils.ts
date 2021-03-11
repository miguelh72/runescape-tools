import readline from 'readline';
import chalk, { Chalk } from "chalk";
import { plot } from 'nodeplotlib';
import { ExpPage, HtmlPage } from './types';
import validate from './validate';
import crawler from './crawler';
import parse from 'node-html-parser';

const NUM_PROGRESS_BARS: number = 70;

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
     * Add a point to the function. Datapoint will be placed in the series according to the independent variable's natural ordering. If xi exists in series, its corresponding f value will be updated to fi.
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
        for (let i = 0; i < this.#x.length; i++) {
            if (xi < this.#x[i]) {
                this.#f.splice(i, 0, fi);
                this.#x.splice(i, 0, xi);
                return;
            } else if (xi === this.#x[i]) {
                this.#f[i] = fi;
                return
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

        // TODO maintain natural ordering for independent variable.

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

    /**
     * Create a new TabularFunction with domain containing intersection of its own independent series and the passed domainSeries. By default 'linear' interpolation method is used.
     * 
     * Available interpolation methods:
     *  * 'rightshift' - shift dependent variable value's to the right for each missing point (shifts left only for points left of function domain).
     *  * 'linear' (default) - calculate line between available datapoints and use these lines to interpolate missing points. Method left-shift at start and right-shift at end.
     * @param domainSeries 
     */
    interpolate(domainSeries: number[], method: string = 'linear'): TabularFunction {
        if (this.length === 0) { throw new Error('Cannot interpolate: TabularFunction is empty.'); }
        if (!(domainSeries instanceof Array)) { throw new TypeError('Series to interpolate must be number Array.'); }
        domainSeries.forEach(v => {
            if (typeof v !== 'number') { throw new TypeError('Series to interpolate must be an Array of all numbers.') }
        });

        if (domainSeries.length === 0) {
            return new TabularFunction(this.#f.slice(), this.#x.slice())
        }

        const independentVarSeries: number[] = this.#x.concat(domainSeries);
        independentVarSeries.sort((a, b) => a - b);
        const outFn = new TabularFunction();
        let functionIndex = 0;
        switch (method) {
            case 'linear':
                // Handle potential leftshift at begining
                while (independentVarSeries[0] < this.#x[0]) {
                    outFn.addDatapoint(this.#f[0], independentVarSeries.shift() as number);
                }
                // rightshift
                while (independentVarSeries.length > 0 && functionIndex < this.length - 1) {
                    if (independentVarSeries[0] === this.#x[functionIndex]) {
                        outFn.addDatapoint(this.#f[functionIndex], independentVarSeries.shift() as number);
                    } else if (independentVarSeries[0] < this.#x[functionIndex + 1]) {
                        // Slope-intersect form
                        const slope = (this.#f[functionIndex + 1] - this.#f[functionIndex]) / (this.#x[functionIndex + 1] - this.#x[functionIndex]);
                        const xi = independentVarSeries.shift() as number;
                        outFn.addDatapoint(slope * (xi - this.#x[functionIndex]) + this.#f[functionIndex], xi);
                    } else {
                        functionIndex++;
                    }
                }
                // rightshift at end
                independentVarSeries.forEach(xi => outFn.addDatapoint(this.#f[this.length - 1], xi));
                break;
            case 'rightshift':
                // Handle potential leftshift at begining
                while (independentVarSeries[0] < this.#x[0]) {
                    outFn.addDatapoint(this.#f[0], independentVarSeries.shift() as number);
                }
                // rightshift
                while (independentVarSeries.length > 0 && functionIndex < this.length - 1) {
                    if (independentVarSeries[0] < this.#x[functionIndex + 1]) {
                        outFn.addDatapoint(this.#f[functionIndex], independentVarSeries.shift() as number);
                    } else {
                        functionIndex++;
                    }
                }
                // rightshift at end
                independentVarSeries.forEach(xi => outFn.addDatapoint(this.#f[this.length - 1], xi));
                break;
            default:
                throw new TypeError('Method must be a string from available options (see documentation).')
        }
        return outFn;
    }

    /**
     * Launch a browser window with a scatter plot of the TabularFunction.
     * @param title Optional graph title.
     * @param xLegend Optional x-axis legend.
     * @param yLegend Optional y-axis legend.
     */
    plot(options: { title?: string, xLegend?: string, yLegend?: string } = {}): void {
        if (options.title !== undefined && typeof options.title !== 'string') { throw new TypeError('Graph title must be a string.'); }
        if (options.xLegend !== undefined && typeof options.xLegend !== 'string') { throw new TypeError('Graph x-legend must be a string.'); }
        if (options.yLegend !== undefined && typeof options.yLegend !== 'string') { throw new TypeError('Graph y-legend must be a string.'); }

        plot([{
            x: this.#x,
            y: this.#f,
            mode: 'markers'
        }], {
            title: { text: options?.title, font: { size: 20 } },
            xaxis: { title: options?.xLegend },
            yaxis: { title: options?.yLegend }
        })
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

function getTimestampFromUrl(url: string): number {
    let dateStartIndex = url.indexOf('&date=');
    if (dateStartIndex === -1) { throw new Error('URL does not contain date parameter'); }
    dateStartIndex += 6;
    const dateEndIndex = url.indexOf('&page=');
    if (dateEndIndex === -1) { throw new Error('URL does not contain page parameter'); }
    return parseInt(url.slice(dateStartIndex, dateEndIndex));
}
function getPageNumberFromUrl(url: string): number {
    let pageNumStartIndex = url.indexOf('&page=');
    if (pageNumStartIndex === -1) { throw new Error('URL does not contain page parameter'); }
    pageNumStartIndex += 6;
    return parseInt(url.slice(pageNumStartIndex, url.length));
}
function doesExpPageHaveData(page: HtmlPage): boolean {
    if (page.html.includes('Sorry, there are currently no players to display')) {
        return false;
    } else if (parse(page.html).querySelector('div.tableWrap') !== null) {
        return true
    } else {
        throw new Error(`Page has highscore URL but it does not contain neither data nor a not enough players response. Perhaps it's a critical server error page.\nURL: ${page.url}`);
    }
}
function getPageTotalExp(page: HtmlPage): number {
    return parse(page.html)
        .querySelectorAll('div.tableWrap table')[1]
        .querySelectorAll('tr')
        .map((tr) => parseInt(tr.querySelectorAll('td')[2].text.trim().replace(/[,]/g, '')))
        .reduce((sum, exp) => sum + exp);
}
/**
 * Convert an HtmlPage to an ExpPage. Throws error if HtmlPage is not from a highscore experience page.
 * @param htmlPage HtmlPage of a highscore experience page.
 */
export function getExpPage(htmlPage: HtmlPage): ExpPage {
    validate.htmlPage(htmlPage);
    if (!htmlPage.url.includes(crawler.HIGHSCORE_ENDPOINT)) { throw new Error('URL is not for a highscore experience page.'); }

    const periodStart: number = getTimestampFromUrl(htmlPage.url);
    const pageNum: number = getPageNumberFromUrl(htmlPage.url);
    const hasData: boolean = doesExpPageHaveData(htmlPage);
    const exp: number = (hasData) ? getPageTotalExp(htmlPage) : 0;
    return { url: htmlPage.url, exp, periodStart, pageNum, hasData };
}
