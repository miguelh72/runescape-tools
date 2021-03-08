import highscores from "../highscores";
import { CRAWL_WEEK_START } from "../settings";
import { Skill } from "../types";
import { DAY_TIMELAPSE, WEEK_TIMELAPSE } from "../utils";
import { expGainPageExample } from "./results";

test('Extract timestamp and page number from URL', () => {
    const URLs = [
        'http://secure.runescape.com/m=hiscore/ranking?category_type=0&table=0&time_filter=1&date=1609529796557&page=1',
        'http://secure.runescape.com/m=hiscore/ranking?category_type=0&table=0&time_filter=1&date=1609529796557&page=51',
        'http://secure.runescape.com/m=hiscore/ranking?category_type=0&table=0&time_filter=1&date=1609529796557&page=101',
        'http://secure.runescape.com/m=hiscore/ranking?category_type=0&table=0&time_filter=1&date=1609529796557&page=201',
        'http://secure.runescape.com/m=hiscore/ranking?category_type=0&table=0&time_filter=1&date=1609529796557&page=301',
        'http://secure.runescape.com/m=hiscore/ranking?category_type=0&table=0&time_filter=1&date=1609529796557&page=401',
        'http://secure.runescape.com/m=hiscore/ranking?category_type=0&table=0&time_filter=1&date=1609529796557&page=501',
        'http://secure.runescape.com/m=hiscore/ranking?category_type=0&table=0&time_filter=1&date=1609529796557&page=1001',
        'http://secure.runescape.com/m=hiscore/ranking?category_type=0&table=0&time_filter=1&date=1609529796557&page=2001',
        'http://secure.runescape.com/m=hiscore/ranking?category_type=0&table=0&time_filter=1&date=1609529796557&page=3001',
    ];
    const timeStamp = 1609529796557;
    const pageNums = [1, 51, 101, 201, 301, 401, 501, 1001, 2001, 3001];
    URLs.forEach((url, i) => {
        expect(highscores.__tests__.getTimestampFromUrl(url)).toEqual(timeStamp);
        expect(highscores.__tests__.getPageNumberFromUrl(url)).toEqual(pageNums[i]);
    });
});

test('Get total exp from exp gain page', () => {
    expect(highscores.__tests__.getPageTotalExp(expGainPageExample)).toEqual(83110129);
});

test('Check if week was a double exp week', () => {
    highscores.__tests__.DOUBLE_EXP_EVENTS.forEach(([weekStart, weekEnd]) => {
        expect(highscores.__tests__.isDoubleExpWeek(weekStart)).toBe(true);
        expect(highscores.__tests__.isDoubleExpWeek(weekEnd)).toBe(false);
        expect(highscores.__tests__.isDoubleExpWeek(weekStart + DAY_TIMELAPSE)).toBe(true);
        expect(highscores.__tests__.isDoubleExpWeek(weekStart - DAY_TIMELAPSE)).toBe(false);
    });
});

test('Get weekly exp timeseries', async () => {
    const lowestExpectedTotalWeeklyExpGain = 400000000000;
    const highestExpectedTotalWeeklyExpGain = 2000000000000;
    await highscores.getWeeklyExpGains(Skill.overall).then(fn => {
        fn.f.forEach(f => {
            expect(f).toBeGreaterThan(lowestExpectedTotalWeeklyExpGain);
            expect(f).toBeLessThan(highestExpectedTotalWeeklyExpGain);
        });
        expect(fn.x[0]).toEqual(CRAWL_WEEK_START);
        fn.x.slice(0, fn.length - 1).forEach((x, i) => {
            expect(fn.x[i + 1] - x).toEqual(WEEK_TIMELAPSE);
        });
    });
});