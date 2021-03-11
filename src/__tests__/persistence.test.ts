import fs from 'fs';
import crawler from '../crawler';
import grandexchange from '../grandexchange';
import persistence from '../persistence';
import { DATASTORE_FOLDER } from '../settings';
import { ExpPage } from '../types';
import { getExpPage } from '../utils';
import { expGainPageExample, itemPricesExample, notEnoughPlayersPageExample } from './results';

test('Load and save item list', () => {
    // Test assumes this was ran beforehand and simply confirms all itesm are loaded.
    grandexchange.buildItemList();

    const itemList = persistence.fetchItemList();
    fs.rmSync(DATASTORE_FOLDER + '/' + persistence.__tests__.ITEM_DB_NAME);
    persistence.saveItemList(itemList);
    const itemListReloaded = persistence.fetchItemList();
    expect(itemListReloaded).toEqual(itemList);
});

test('Verify endpoint without enough players to calculate gain exp.', () => {
    persistence.saveExpPage({ url: notEnoughPlayersPageExample.url, exp: 0, periodStart: 1610739396557, pageNum: 3001, hasData: false })
    expect(persistence.fetchExpPage(notEnoughPlayersPageExample.url)?.hasData).toBe(false);
});

test('Save, verify existence, and retrieve exp gain page.', () => {
    expect(expGainPageExample.url.includes(crawler.HIGHSCORE_ENDPOINT)).toBe(true);
    const originalExpPage = getExpPage(expGainPageExample);
    persistence.saveExpPage(originalExpPage);
    const expPage = persistence.fetchExpPage(expGainPageExample.url) as ExpPage;
    expect(expPage !== null).toBe(true)
    expect(expPage).toEqual(originalExpPage);
});

test('Delete, save, and fetch item price data', () => {
    const filepath = persistence.__tests__.getPricesFilepath(itemPricesExample.id);
    if (fs.existsSync(filepath)) {
        fs.rmSync(filepath);
    }

    persistence.savePrices(itemPricesExample);
    expect(fs.existsSync(filepath)).toBe(true);
    const fetchedPrices = persistence.fetchPrices(itemPricesExample.id);
    expect(fetchedPrices?.id).toEqual(itemPricesExample.id);
    expect(fetchedPrices?.prices.x).toEqual(itemPricesExample.prices.x);
    expect(fetchedPrices?.prices.f).toEqual(itemPricesExample.prices.f);
});

test('Verify data store integrity', async () => {
    expect(await persistence.verifyDatabaseIntegrity()).toBe(true);
});
