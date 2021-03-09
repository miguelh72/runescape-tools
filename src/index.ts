import got from 'got';
import tunnel from 'tunnel';
import crawler from './crawler';
import grandexchange from './grandexchange';
import { Skill } from './types';



(async () => {
    const priceData = await grandexchange.getYearPriceData(2);
    console.log(priceData?.length)


})();
