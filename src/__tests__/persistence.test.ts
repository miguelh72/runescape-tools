import crawler from '../crawler';
import persistence from '../persistence';
import { CRAWL_WEEK_START } from '../settings';
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
});