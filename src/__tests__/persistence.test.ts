import fs from 'fs';
import crawler from '../crawler';
import grandexchange from '../grandexchange';
import persistence from '../persistence';
import { CRAWL_WEEK_START, ITEM_DB_NAME } from '../settings';
import { Skill, Timeframe } from '../types';
import { expGainPageExample } from './results';

test('Verify endpoint without enough players to calculate gain exp.', () => {
    const notEnoughPlayersEndpoint = 'http://secure.runescape.com/m=hiscore/ranking?category_type=0&table=21&time_filter=1&date=1610739396557&page=3001';
    persistence.saveEndpointWithoutEnoughPlayers(notEnoughPlayersEndpoint);
    expect(persistence.isEndpointWithoutEnoughPlayers(notEnoughPlayersEndpoint)).toBe(true);
});

test('Save, verify existence, and retrieve exp gain page.', async () => {
    const url = crawler.__tests__.geSkillHighscoreUrlSet(Skill.overall, Timeframe.weekly, CRAWL_WEEK_START)[0];
    expect(crawler.isValidExpGainPage(expGainPageExample)).toBe(true);
    persistence.saveHtmlPage(expGainPageExample);
    expect(persistence.isInStorage(url)).toBe(true);
    const htmlPage = persistence.getExpGainPageFromUrl(expGainPageExample.url);
    if (htmlPage === null) { fail('Returned page was null.') }
    expect(htmlPage.url).toEqual(expGainPageExample.url);
    expect(htmlPage.html.replace(/\s/, '')).toEqual(expGainPageExample.html.replace(/\s/, ''));
});

test('Verify data store integrity', async () => {
    expect(await persistence.verifyDatabaseIntegrity()).toBe(true);
}, 30000);

test('Load and save item list', () => {
    // Test assumes this was ran beforehand and simply confirms all itesm are loaded.
    grandexchange.buildItemList();

    const itemList = persistence.loadItemList();
    fs.rmSync(ITEM_DB_NAME);
    persistence.saveItemList(itemList);
    const itemListReloaded = persistence.loadItemList();
    expect(itemListReloaded).toEqual(itemList);
});