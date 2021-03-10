import got from 'got';
import tunnel from 'tunnel';
import crawler from './crawler';
import grandexchange from './grandexchange';
import persistence from './persistence';
import { PROXY_LIST } from './settings';
import { Skill } from './types';
import validate from './validate';



(async () => {
    //persistence.convertToExpPageSystem();

    persistence.verifyDatabaseIntegrity();
})();
