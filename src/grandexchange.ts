import { grandexchange as ge } from "runescape-api"
import { Item, ItemCategory } from "./types";
import { bold, error, isInTesting, printProgress } from './utils';
import crawler from "./crawler";
import persistence from './persistence';

let _itemList: ItemCategory[] = persistence.fetchItemList();

/**
 * Using unofficial Runescape API build a list of all Grand Exchange tradeable items.
 */
async function buildItemList(): Promise<void> {
    if (!isInTesting()) { console.log(`Building Grand Exchange ${bold('item database')}.`); }
    const geCategories = await ge.getCategories();

    const allItems: ItemCategory[] = [];
    for (let i = 0; i < geCategories.length; i++) {
        printProgress(Math.round((i / geCategories.length) * 100));
        if (_itemList.some(category => category.id === i)) {
            allItems.push(_itemList[_itemList.findIndex(category => category.id === i)]);
        } else {
            const geCategory: ItemCategory = { id: geCategories[i].id, name: geCategories[i].name, items: [] };
            const categoryCounts = await ge.getCategoryCounts(geCategory.id);
            for (const catCount of categoryCounts) {
                // TODO skip further calls if catCount matches item list in memory. This allows updating if Jagex changes items.
                if (catCount.items > 0) {
                    let itemCount = 0;
                    let items: any[];
                    let page: number = 1;
                    do {
                        items = await ge.getCategoryCountsByPrefix(geCategory.id, catCount.letter as any, page++);
                        if (items === undefined) { throw new Error(error(`Returned undefined while evaluating page ${page - 1} of letter "${catCount.letter}" of category id: ${geCategory.id}`)); }
                        itemCount += items.length;
                        items.forEach(item => geCategory.items.push({
                            id: item.id,
                            name: item.name,
                            description: item.description,
                            members: item.members === 'true',
                        }));
                    } while (items.length === 12)
                    if (catCount.letter !== '#' && itemCount !== catCount.items) { throw new Error(error(`Did not get all items back for "${catCount.letter}" of category id: ${geCategory.id}. Received ${items.length} out of ${catCount.items}.`)) }
                }
            }
            allItems.push(geCategory);
            persistence.saveItemList(allItems);
            _itemList = allItems;
        }
    }
    printProgress(100);
}

/**
 * Generate list of items whose name match a search term. Empty list is returned if no matches were found.
 * @param term String search term to match against items name.
 */
function searchItemList(term: string): Item[] {
    if (typeof term !== 'string') { throw new TypeError('Search term must be a string with length greater than 0.'); }

    term = term.toLowerCase();
    const matchingItems: Item[] = [];
    _itemList.forEach(itemCategory => {
        const category = { id: itemCategory.id, name: itemCategory.name };
        itemCategory.items.forEach(itemChild => {
            if (itemChild.name.toLowerCase().includes(term)) {
                const item: any = Object.assign({}, itemChild);
                item.geCategory = category;
                matchingItems.push(item);
            }
        });
    });
    return matchingItems;
}

export default {
    buildItemList,
    searchItemList,
    getYearPriceData: crawler.getYearPriceData
};