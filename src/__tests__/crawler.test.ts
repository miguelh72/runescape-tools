import crawler from "../crawler";
import persistence from "../persistence";
import { CRAWL_WEEK_START, PROXY_LIST } from "../settings";
import { HtmlPage, Skill, Timeframe } from "../types";
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
/*
test('Load html page through a proxy', async () => {
    const page = await crawler.loadHtmlPage(internetingishard.url, true);
    expect(page.url).toEqual(internetingishard.url);
    expect(page.html.replace(/\s/g, '')).toEqual(internetingishard.html.replace(/\s/g, ''));
}, 30000);
*/
test('Verify exp gain page', () => {
    expect(crawler.isValidExpGainPage(expGainPageExample)).toBe(true);
    expect(crawler.isValidExpGainPage(internetingishard)).toBe(false);
});

test('Proxy error count', () => {
    crawler.__tests__.logProxyErrorEvent(crawler.__tests__._proxyErrorCounter[0][1]);
    expect(crawler.__tests__._proxyErrorCounter[0][0]).toEqual(1);
});

test('Retrieve all weekly exp gain pages for a skill', async () => {
    /* RUN the following code outside of testing first to load all pages to memory:
        crawler.getSkillWeeklyExpGainHtmlPages(Skill.runecrafting);
    */

    const skill = Skill.runecrafting;
    const allUrls: string[] = crawler.__tests__.geSkillHighscoreUrlSet(skill, Timeframe.weekly, CRAWL_WEEK_START);
    const allPages: HtmlPage[] = await crawler.getSkillWeeklyExpGainHtmlPages(skill);

    function urlInPages(pages: HtmlPage[], url: string): boolean {
        return pages.some(page => page.url === url);
    }

    //  all pages were returned or did not have enough players
    allUrls.forEach(url => {
        const wasProcessed = persistence.isEndpointWithoutEnoughPlayers(url) || urlInPages(allPages, url);
        expect(wasProcessed).toBe(true);
    });
}, 10000);
/*
test("Retrieve a year's worth of price data", async () => {
    const priceData = await crawler.getYearPriceData(556);
    expect(priceData !== undefined).toBe(true);
    expect(priceData).toHaveLength(365);
    expect(priceData?.x[0]).toBeGreaterThanOrEqual(Date.now() - 366 * 24 * 60 * 60 * 1000);
    expect(priceData?.x[364]).toBeLessThanOrEqual(Date.now());
    expect(priceData?.f.some(v => v <= 0)).toBe(false);
    // Don't expect air rune to be worth 200 anytime soon
    expect(priceData?.f.some(v => v > 200)).toBe(false);
});
*/