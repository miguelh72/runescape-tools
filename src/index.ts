import { ItemPrices, Skill } from './types';
import { TabularFunction } from './utils';
import grandexchange from './grandexchange';
import highscores from './highscores';
import { YEAR_TIMELAPSE } from './settings';

// Quickly test code below during dev
(async () => {
    const skill = Skill.runecrafting;
    const itemName = 'air rune';

    const expGains: TabularFunction = await highscores.getWeeklyExpGains(skill);
    console.log();
    const itemID: number = grandexchange.searchItemList(itemName)[0].id;
    const itemPrices = await grandexchange.getYearPriceData(itemID);
    if (itemPrices !== null) {
        const expGainsInterpolated: TabularFunction = expGains.interpolate(itemPrices.prices.x, 'linear');

        itemPrices.prices.plot({ title: itemName + ' Prices' });
        expGainsInterpolated.plot({ title: Skill[skill] + ' Interpolated Exp Gain Per Week' });
    }
})();
