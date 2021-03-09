import parse from "node-html-parser";
import crawler from "./crawler";
import { HtmlPage, Skill } from "./types";
import { integrate, TabularFunction, WEEK_TIMELAPSE } from "./utils";
import validate from "./validate";

const DOUBLE_EXP_EVENTS: [number, number][] = [ // TODO load this from wiki
    ['19 February 2021 UTC-12:00', '1 March 2021 UTC-12:00'],
    ['6 November 2020 UTC-12:00', '16 November 2020 UTC-12:00'],
    ['7 August 2020 UTC-12:00', '17 August 2020 UTC-12:00'],
    ['8 May 2020 UTC-12:00', '18 May 2020 UTC-12:00'],
    ['21 February 2020 UTC-12:00', '2 March 2020 UTC-12:00'],
    ['22 November 2019 UTC-12:00', '2 December 2019 UTC12:00'],
    ['26 July 2019 UTC-12:00', '29 July 2019 UTC-12:00'],
    ['22 February 2019 UTC-12:00', '25 February 2019 UTC-12:00'],
].map((event) => [new Date(event[0]).getTime(), new Date(event[1]).getTime()]);

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

function getPageTotalExp(page: HtmlPage): number {
    validate.htmlPage(page);
    if (!crawler.isValidExpGainPage(page)) { throw new TypeError('Page must be a valid highscore experience gain page.'); }

    return parse(page.html)
        .querySelectorAll('div.tableWrap table')[1]
        .querySelectorAll('tr')
        .map((tr) => parseInt(tr.querySelectorAll('td')[2].text.trim().replace(/[,]/g, '')))
        .reduce((sum, exp) => sum + exp);
}

function isDoubleExpWeek(weekStart: number): boolean {
    return DOUBLE_EXP_EVENTS.reduce((isDoubleExpWeek: boolean, [doubleExpWeekStart, doubleExpWeekEnd]): boolean => {
        return isDoubleExpWeek || ((weekStart >= doubleExpWeekStart) && (weekStart < doubleExpWeekEnd));
    }, false);
}

async function getWeeklyExpGains(skill: Skill): Promise<TabularFunction> {
    validate.skill(skill);

    const htmlPages: HtmlPage[] = await crawler.getSkillWeeklyExpGainHtmlPages(skill);
    const timeStampGroupedPages: { [key: number]: HtmlPage[] } = htmlPages.reduce((grouped: { [key: number]: HtmlPage[] }, page: HtmlPage) => {
        const timestamp = getTimestampFromUrl(page.url);
        if (grouped[timestamp] === undefined) { grouped[timestamp] = []; }
        grouped[timestamp].push(page);
        return grouped;
    }, {});

    const expTimeSeries = new TabularFunction();
    for (const timeStampStr in timeStampGroupedPages) {
        const pageNumSeries: { pageNums: number[], totalPageExps: number[] } = timeStampGroupedPages[timeStampStr].reduce(
            (pageNumSeries: { pageNums: number[], totalPageExps: number[] }, page: HtmlPage) => {
                pageNumSeries.pageNums.push(getPageNumberFromUrl(page.url));
                pageNumSeries.totalPageExps.push(getPageTotalExp(page));
                return pageNumSeries;
            }, { pageNums: [], totalPageExps: [] }
        );
        const timeStamp = parseInt(timeStampStr);
        let estTotalWeekExp = integrate(pageNumSeries.totalPageExps, pageNumSeries.pageNums, pageNumSeries.totalPageExps[0]);
        if (isDoubleExpWeek(timeStamp)) {
            estTotalWeekExp /= 2;
        }

        expTimeSeries.addDatapoint(estTotalWeekExp, timeStamp);
    }
    return expTimeSeries;
}

export default {
    getWeeklyExpGains,

    /**
     * Do not use these functions outside of testing.
     */
    __tests__: {
        getTimestampFromUrl,
        getPageNumberFromUrl,
        getPageTotalExp,
        DOUBLE_EXP_EVENTS,
        isDoubleExpWeek,
    }
};