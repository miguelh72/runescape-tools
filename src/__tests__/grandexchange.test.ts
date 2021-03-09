import grandexchange from "../grandexchange";

test('Search item list.', () => {
    // Test assumes this was ran beforehand and simply confirms all itesm are loaded.
    grandexchange.buildItemList();

    const foundItems = grandexchange.searchItemList(' 2h ');
    expect(foundItems.length).toBeGreaterThanOrEqual(23);
    [
        { name: 'Abyssal Bane 2h Sword', id: 45321 },
        { name: 'Adamant 2h Crossbow', id: 25927 },
        { name: 'Adamant 2h Sword', id: 45511 },
        { name: 'Dragon 2h Crossbow', id: 25932 },
        { name: 'Mithril 2h Crossbow', id: 25925 },
    ].forEach(expectedItem => {
        expect(foundItems.some(item => item.id === expectedItem.id)).toBe(true);
    });
});