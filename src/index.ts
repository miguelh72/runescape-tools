import grandexchange from './grandexchange';
import highscores from './highscores';
import { Skill } from './types';
import { TabularFunction } from './utils';

// Quickly test code below during dev
(async () => {
    const skill = Skill.runecrafting;
    const itemName = 'rune essence';

    const expGains: TabularFunction = await highscores.getWeeklyExpGains(skill);
    console.log();
    const itemID: number = grandexchange.searchItemList(itemName)[0].id;
    const itemPrices: TabularFunction = await grandexchange.getYearPriceData(itemID) as TabularFunction;
    const expGainsInterpolated: TabularFunction = expGains.interpolate(itemPrices.x);

    itemPrices.plot({ title: itemName + ' Prices' });
    expGainsInterpolated.plot({ title: Skill[skill] + ' Interpolated Exp Gain Per Week' });
})();
