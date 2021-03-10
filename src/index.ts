import highscores from './highscores';
import { Skill } from './types';
import { TabularFunction } from './utils';

// Quickly test code below during dev
(async () => {
    for (let skill = 0; skill < 29; skill++) {
        const timeSeries: TabularFunction = await highscores.getWeeklyExpGains(skill);
        timeSeries.plot({ title: Skill[skill] });
    }
})();
