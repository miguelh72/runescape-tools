import highscores from "../highscores";
import { CRAWL_WEEK_START } from "../settings";
import { Skill } from "../types";
import { DAY_TIMELAPSE, WEEK_TIMELAPSE } from "../utils";

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