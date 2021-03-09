import validate from '../validate';

test('Validate Skill', () => {
    for (let sk = 0; sk < 29; sk++) {
        expect(validate.skill(sk)).toBeUndefined();
    }
    expect(() => validate.skill(undefined as any)).toThrowError(TypeError);
    expect(() => validate.skill(-1)).toThrowError(TypeError);
    expect(() => validate.skill(29)).toThrowError(TypeError);
});

test('Validate Timeframe', () => {
    expect(validate.timeframe(0)).toBeUndefined();
    expect(validate.timeframe(1)).toBeUndefined();
    expect(validate.timeframe(2)).toBeUndefined();
    expect(() => validate.timeframe(undefined as any)).toThrowError(TypeError);
    expect(() => validate.timeframe(-1)).toThrowError(TypeError);
    expect(() => validate.timeframe(3)).toThrowError(TypeError);
});

test('Validate URL', () => {
    expect(() => validate.url(undefined as any)).toThrowError(TypeError);
    ([
        ['http://www.google-com.123.com', true],
        ['http://www.google-com.123', false],
        ['https://www.google-com.com', true],
        ['http://google-com.com', true],
        ['http://google.com', true],
        ['google.com', false],
        ['http://www.gfh.', false],
        ['http://www.gfh.c', false],
        ['http://www.gfh:800000', false],
        ['www.google.com ', false],
        ['http://google', false],
        ['//cdnblabla.cloudfront.net/css/app.css', true],
        ['http://google.net', true],
    ] as [string, boolean][]).map(([url, isValid]) => {
        if (isValid) {
            expect(validate.url(url)).toBeUndefined();
        } else {
            expect(() => validate.url(url)).toThrowError(TypeError);
        }
    });
});

test('Validate HtmlPage', () => {
    const goodUrl = 'http://wwww.google.com';
    const badUrl = 'apple.txt';
    const goodHtml = '<!DOCTYPE html><html><body></body></html>';
    const badHtml = '{ "name":"John", "age":30, "car":null }';

    expect(validate.htmlPage({ url: goodUrl, html: goodHtml })).toBeUndefined();
    expect(() => validate.htmlPage({} as any)).toThrowError(TypeError);
    expect(() => validate.htmlPage({ html: goodHtml } as any)).toThrowError(TypeError);
    expect(() => validate.htmlPage({ url: goodUrl } as any)).toThrowError(TypeError);
    expect(() => validate.htmlPage({ url: badUrl, html: goodHtml })).toThrowError(TypeError);
    expect(() => validate.htmlPage({ url: goodUrl, html: badHtml })).toThrowError(TypeError);
    expect(() => validate.htmlPage({ url: badUrl, html: badHtml })).toThrowError(TypeError);
});

test('Validate ExpPage', () => {
    const goodUrl = 'http://wwww.google.com';
    const badUrl = 'apple.txt';
    expect(validate.expPage({ url: goodUrl, exp: 100, periodStart: Date.now(), pageNum: 1 })).toBeUndefined();

    expect(() => validate.expPage({} as any)).toThrowError(TypeError);
    expect(() => validate.expPage({ exp: 100, periodStart: Date.now(), pageNum: 1 } as any)).toThrowError(TypeError);
    expect(() => validate.expPage({ url: goodUrl, periodStart: Date.now(), pageNum: 1 } as any)).toThrowError(TypeError);
    expect(() => validate.expPage({ url: goodUrl, exp: 100, pageNum: 1 } as any)).toThrowError(TypeError);
    expect(() => validate.expPage({ url: goodUrl, exp: 100, periodStart: Date.now() } as any)).toThrowError(TypeError);

    expect(() => validate.expPage({ url: badUrl, exp: 100, periodStart: Date.now(), pageNum: 1 } as any)).toThrowError(TypeError);
    expect(() => validate.expPage({ url: goodUrl, exp: '100', periodStart: Date.now(), pageNum: 1 } as any)).toThrowError(TypeError);
    expect(() => validate.expPage({ url: goodUrl, exp: 100, periodStart: Date.now() + '', pageNum: 1 } as any)).toThrowError(TypeError);
    expect(() => validate.expPage({ url: goodUrl, exp: 100, periodStart: Date.now(), pageNum: '1' } as any)).toThrowError(TypeError);
});

test('Validate ItemCategoryChild', () => {
    expect(validate.itemCategoryChild({ id: 1, name: 'item', description: 'an item', members: false })).toBeUndefined();

    expect(() => validate.itemCategoryChild({} as any)).toThrowError(TypeError);
    expect(() => validate.itemCategoryChild({ name: 'item', description: 'an item', members: false } as any)).toThrowError(TypeError);
    expect(() => validate.itemCategoryChild({ id: 1, description: 'an item', members: false } as any)).toThrowError(TypeError);
    expect(() => validate.itemCategoryChild({ id: 1, name: 'item', members: false } as any)).toThrowError(TypeError);
    expect(() => validate.itemCategoryChild({ id: 1, name: 'item', description: 'an item' } as any)).toThrowError(TypeError);

    expect(() => validate.itemCategoryChild({ id: '1', name: 'item', description: 'an item', members: false } as any)).toThrowError(TypeError);
    expect(() => validate.itemCategoryChild({ id: 1, name: 1, description: 'an item', members: false } as any)).toThrowError(TypeError);
    expect(() => validate.itemCategoryChild({ id: 1, name: 'item', description: 1, members: false } as any)).toThrowError(TypeError);
    expect(() => validate.itemCategoryChild({ id: 1, name: 'item', description: 'an item', members: 'false', } as any)).toThrowError(TypeError);
});


test('Validate Item', () => {
    expect(validate.item({ id: 1, name: 'item', description: 'an item', members: false, geCategory: { id: 1, name: 'category' } })).toBeUndefined();

    expect(() => validate.item({ name: 'item', description: 'an item', members: false, geCategory: { id: 1, name: 'category' } } as any)).toThrowError(TypeError);
    expect(() => validate.item({ id: 1, description: 'an item', members: false, geCategory: { id: 1, name: 'category' } } as any)).toThrowError(TypeError);
    expect(() => validate.item({ id: 1, name: 'item', members: false, geCategory: { id: 1, name: 'category' } } as any)).toThrowError(TypeError);
    expect(() => validate.item({ id: 1, name: 'item', description: 'an item', geCategory: { id: 1, name: 'category' } } as any)).toThrowError(TypeError);
    expect(() => validate.item({ id: 1, name: 'item', description: 'an item', members: false } as any)).toThrowError(TypeError);
    expect(() => validate.item({ id: 1, name: 'item', description: 'an item', members: false, geCategory: { name: 'category' } } as any)).toThrowError(TypeError);
    expect(() => validate.item({ id: 1, name: 'item', description: 'an item', members: false, geCategory: { id: 1 } } as any)).toThrowError(TypeError);

    expect(() => validate.item({ id: '1', name: 'item', description: 'an item', members: false, geCategory: { id: 1, name: 'category' } } as any)).toThrowError(TypeError);
    expect(() => validate.item({ id: 1, name: 1, description: 'an item', members: false, geCategory: { id: 1, name: 'category' } } as any)).toThrowError(TypeError);
    expect(() => validate.item({ id: 1, name: 'item', description: 1, members: false, geCategory: { id: 1, name: 'category' } } as any)).toThrowError(TypeError);
    expect(() => validate.item({ id: 1, name: 'item', description: 'an item', members: 'false', geCategory: { id: 1, name: 'category' } } as any)).toThrowError(TypeError);
    expect(() => validate.item({ id: 1, name: 'item', description: 'an item', members: false, geCategory: { id: '1', name: 'category' } } as any)).toThrowError(TypeError);
    expect(() => validate.item({ id: 1, name: 'item', description: 'an item', members: false, geCategory: { id: 1, name: 1 } } as any)).toThrowError(TypeError);
    expect(() => validate.item({ id: 1, name: 'item', description: 'an item', members: false, geCategory: [] } as any)).toThrowError(TypeError);
});

test('Validate ItemCategory', () => {
    expect(validate.itemCategory({ id: 1, name: 'item category', items: [] })).toBeUndefined();
    expect(validate.itemCategory({ id: 1, name: 'item category', items: [{ id: 1, name: 'item', description: 'an item', members: false }] })).toBeUndefined();

    expect(() => validate.itemCategory({} as any)).toThrowError(TypeError);
    expect(() => validate.itemCategory({ name: 'item category', items: [{ id: 1, name: 'item', description: 'an item', members: false }] } as any)).toThrowError(TypeError);
    expect(() => validate.itemCategory({ id: 1, items: [{ id: 1, name: 'item', description: 'an item', members: false }] } as any)).toThrowError(TypeError);
    expect(() => validate.itemCategory({ id: 1, name: 'item category' } as any)).toThrowError(TypeError);
    expect(() => validate.itemCategory({ id: 1, name: 'item category', items: [{ name: 'item', description: 'an item', members: false }] } as any)).toThrowError(TypeError);
    expect(() => validate.itemCategory({ id: 1, name: 'item category', items: [{ id: 1, description: 'an item', members: false }] } as any)).toThrowError(TypeError);
    expect(() => validate.itemCategory({ id: 1, name: 'item category', items: [{ id: 1, name: 'item', members: false }] } as any)).toThrowError(TypeError);
    expect(() => validate.itemCategory({ id: 1, name: 'item category', items: [{ id: 1, name: 'item', description: 'an item' }] } as any)).toThrowError(TypeError);

    expect(() => validate.itemCategory({ id: '1', name: 'item category', items: [{ id: 1, name: 'item', description: 'an item', members: false }] } as any)).toThrowError(TypeError);
    expect(() => validate.itemCategory({ id: 1, name: 1, items: [{ id: 1, name: 'item', description: 'an item', members: false }] } as any)).toThrowError(TypeError);
    expect(() => validate.itemCategory({ id: 1, name: 'item category', items: { id: 1, name: 'item', description: 'an item', members: false } } as any)).toThrowError(TypeError);
    expect(() => validate.itemCategory({ id: 1, name: 'item category', items: [{ id: '1', name: 'item', description: 'an item', members: false }] } as any)).toThrowError(TypeError);
    expect(() => validate.itemCategory({ id: 1, name: 'item category', items: [{ id: 1, name: 1, description: 'an item', members: false }] } as any)).toThrowError(TypeError);
    expect(() => validate.itemCategory({ id: 1, name: 'item category', items: [{ id: 1, name: 'item', description: 1, members: false }] } as any)).toThrowError(TypeError);
    expect(() => validate.itemCategory({ id: 1, name: 'item category', items: [{ id: 1, name: 'item', description: 'an item', members: 'false' }] } as any)).toThrowError(TypeError);
});
