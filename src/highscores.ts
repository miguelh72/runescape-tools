import { ExpPage, Skill } from "./types";
import { integrate, TabularFunction } from "./utils";
import validate from "./validate";
import crawler from "./crawler";

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

/**
 * Determine if a week was a double experience gain week.
 * @param weekStart Start of week.
 */
function isDoubleExpWeek(weekStart: number): boolean {
    if (typeof weekStart !== 'number') { throw new TypeError('weekStart must be of type number.'); }

    return DOUBLE_EXP_EVENTS.reduce((isDoubleExpWeek: boolean, [doubleExpWeekStart, doubleExpWeekEnd]): boolean => {
        return isDoubleExpWeek || ((weekStart >= doubleExpWeekStart) && (weekStart < doubleExpWeekEnd));
    }, false);
}

/**
 * Get a TabularFunction timeseries of weekly total exp gain for a Skill from CRAWL_WEEK_START to last finished week.
 * @param skill Skill for which to calculate weekly total exp gain timeseries.
 */
async function getWeeklyExpGains(skill: Skill): Promise<TabularFunction> {
    validate.skill(skill);

    const expPages: ExpPage[] = await crawler.getWeeklyExpPages(skill);
    const periodStartGroupedPages: { [key: number]: ExpPage[] } = expPages.reduce((groupedPages: { [key: number]: ExpPage[] }, expPage: ExpPage) => {
        if (groupedPages[expPage.periodStart] === undefined) { groupedPages[expPage.periodStart] = []; }
        groupedPages[expPage.periodStart].push(expPage);
        return groupedPages;
    }, {});

    const expTimeSeries = new TabularFunction();
    for (const periodStartStr in periodStartGroupedPages) {
        const pageNumSeries: { pageNums: number[], exps: number[] } = periodStartGroupedPages[periodStartStr].reduce(
            (pageNumSeries: { pageNums: number[], exps: number[] }, expPage: ExpPage) => {
                pageNumSeries.pageNums.push(expPage.pageNum);
                pageNumSeries.exps.push(expPage.exp);
                return pageNumSeries;
            }, { pageNums: [], exps: [] }
        );
        const periodStart = parseInt(periodStartStr);
        let estimatedTotalWeekExp = integrate(pageNumSeries.exps, pageNumSeries.pageNums, pageNumSeries.exps[0]);
        if (isDoubleExpWeek(periodStart)) {
            estimatedTotalWeekExp /= 2;
        }
        expTimeSeries.addDatapoint(estimatedTotalWeekExp, periodStart);
    }
    return expTimeSeries;
}

export default {
    getWeeklyExpGains,

    /**
     * Do not use these functions outside of testing.
     */
    __tests__: {
        DOUBLE_EXP_EVENTS,
        isDoubleExpWeek,
    }
};