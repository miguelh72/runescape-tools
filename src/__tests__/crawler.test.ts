import crawler from "../crawler";
import { CRAWL_WEEK_START, PROXY_LIST } from "../settings";
import { Skill, Timeframe } from "../types";
import { internetingishard, expGainPageExample } from './results';

test('Generate highscore URL set', () => {
    const time = new Date('01/01/2020').getTime();

    let skill = Skill.overall;
    let timeframe = Timeframe.weekly;
    let urlSet = crawler.__tests__.geSkillHighscoreUrlSet(skill, timeframe, time);
    expect(urlSet).toHaveLength(10);
    expect(urlSet[0]).toEqual(`http://secure.runescape.com/m=hiscore/ranking?category_type=0&table=${skill}&time_filter=${timeframe}&date=1577854800000&page=1`);
    expect(urlSet[5]).toEqual(`http://secure.runescape.com/m=hiscore/ranking?category_type=0&table=${skill}&time_filter=${timeframe}&date=1577854800000&page=401`);
    expect(urlSet[9]).toEqual(`http://secure.runescape.com/m=hiscore/ranking?category_type=0&table=${skill}&time_filter=${timeframe}&date=1577854800000&page=3001`);

    skill = Skill.prayer;
    timeframe = Timeframe.monthly;
    urlSet = crawler.__tests__.geSkillHighscoreUrlSet(skill, timeframe, time);
    expect(urlSet).toHaveLength(10);
    expect(urlSet[0]).toEqual(`http://secure.runescape.com/m=hiscore/ranking?category_type=0&table=${skill}&time_filter=${timeframe}&date=1577854800000&page=1`);
    expect(urlSet[5]).toEqual(`http://secure.runescape.com/m=hiscore/ranking?category_type=0&table=${skill}&time_filter=${timeframe}&date=1577854800000&page=401`);
    expect(urlSet[9]).toEqual(`http://secure.runescape.com/m=hiscore/ranking?category_type=0&table=${skill}&time_filter=${timeframe}&date=1577854800000&page=3001`);
});

test('Cycle through available proxies', () => {
    for (let i = 0; i < PROXY_LIST.length * 3; i++) {
        const proxyIndex = i % PROXY_LIST.length;
        expect(crawler.__tests__.proxyGenerator.next().value).toEqual(PROXY_LIST[proxyIndex]);
    }
});

test('Load html page', async () => {
    const page = await crawler.loadHtmlPage(internetingishard.url);
    expect(page.url).toEqual(internetingishard.url);
    expect(page.html.replace(/\s/g, '')).toEqual(internetingishard.html.replace(/\s/g, ''));
});

test('Load html page through a proxy', async () => {
    const page = await crawler.loadHtmlPage(internetingishard.url, true);
    expect(page.url).toEqual(internetingishard.url);
    expect(page.html.replace(/\s/g, '')).toEqual(internetingishard.html.replace(/\s/g, ''));
}, 30000);

test('Verify exp gain page', () => {
    expect(crawler.isValidExpGainPage(expGainPageExample)).toBe(true);
    expect(crawler.isValidExpGainPage(internetingishard)).toBe(false);
});

test('Retrieve all weekly exp gain pages for a skill', async () => {
    /* RUN the following code outside of testing first to load all pages to memory:
        crawler.getSkillWeeklyExpGainHtmlPages(Skill.runecrafting);
    */

    const skill = Skill.runecrafting;
    const allUrls = crawler.__tests__.geSkillHighscoreUrlSet(skill, Timeframe.weekly, CRAWL_WEEK_START);
    //const allPages = await crawler.getSkillWeeklyExpGainHtmlPages(skill);
    // TODO test all pages were returned or did not have enough players
});
