import { integrate, isInTesting, isValidUrl, pause, TabularFunction } from "../utils";

test('Know program is in test mode', () => {
    expect(isInTesting()).toBe(true);
});

test('Pause promise', async () => {
    const timeMargin = 20; // ms
    const timeLapse = 500; // ms

    // Default return value
    let startTime = Date.now();
    let returnValue = await pause(timeLapse);
    let endTime = Date.now();
    expect(returnValue).toBe(undefined);
    expect(endTime - startTime).toBeLessThanOrEqual(timeLapse + timeMargin);

    // User defined return value
    const returnObject = { returnObject: true };
    startTime = Date.now();
    returnValue = await pause(timeLapse, returnObject);
    endTime = Date.now();
    expect(returnValue).toBe(returnObject);
    expect(endTime - startTime).toBeLessThanOrEqual(timeLapse + timeMargin);
});

test('Numerical definite integration', () => {
    let length = 11;
    let fo = 5;

    // Trivial case
    expect(integrate([])).toEqual(0);
    let f = Array.from({ length }, () => 0);
    let x = Array.from({ length }, (_, i) => 2 * i);
    expect(integrate(f)).toEqual(0);
    expect(integrate(f, x)).toEqual(0);

    // Constant positive function
    f = Array.from({ length }, () => 1);
    expect(integrate(f)).toEqual(length - 1);
    expect(integrate(f, x)).toEqual(2 * (length - 1));
    expect(integrate(f, x, fo)).toEqual(2 * (length - 1) + fo);

    // Constant negative function
    f = Array.from({ length }, () => -1);
    expect(integrate(f)).toEqual(-(length - 1));
    expect(integrate(f, x)).toEqual(-2 * (length - 1));
    expect(integrate(f, x, fo)).toEqual(-2 * (length - 1) + fo);

    // Linear function
    f = Array.from({ length }, (_, i) => i);
    expect(integrate(f)).toEqual((length - 1) * (length - 1) * 0.5)
    expect(integrate(f, x)).toEqual((length - 1) * (length - 1))
    expect(integrate(f, x, fo)).toEqual((length - 1) * (length - 1) + fo)
});

test('Validate URL', () => {
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
    ] as [string, boolean][]).map(testRow => {
        expect(isValidUrl(testRow[0])).toBe(testRow[1]);
    });
});

test('Using tabular functions', () => {
    let length = 11;
    let from = 3;
    let to = 5;

    // Trivial case, empty function
    let fn = new TabularFunction();
    expect(fn.length).toBe(0);
    expect(fn.f).toEqual([]);
    expect(fn.x).toEqual([]);
    expect(fn.integrate()).toBe(0);
    expect(fn.slice(0)).toEqual(fn);

    // Test adding datapoints method
    for (let i = 0; i < length; i++) {
        fn.addDatapoint(i * 2, i);
        expect(fn.x[fn.x.length - 1]).toEqual(i);
        expect(fn.f[fn.f.length - 1]).toEqual(i * 2);
    }
    let fn2 = new TabularFunction();
    for (let i = length; i > -1; i--) {
        // Datapoints are added according to their independent variable's ordering
        fn2.addDatapoint(i * 2, i);
    }
    expect(fn2).toEqual(fn);

    fn.addDatapoint(7, 3.5);
    expect(fn.length).toEqual(length + 1);
    expect(fn.x[4]).toEqual(3.5);
    expect(fn.f[4]).toEqual(7);

    // Trivial case, zero function
    let f = Array.from({ length }, () => 0);
    let x = Array.from({ length }, (_, i) => 2 * i);
    fn = new TabularFunction(f, x);
    expect(fn.length).toBe(length);
    expect(fn.f).toEqual(f);
    expect(fn.x).toEqual(x);
    expect(fn.slice(0)).toEqual(fn);
    expect(fn.slice(from, to).f).toEqual(f.slice(from, to));
    expect(fn.slice(from, to).x).toEqual(x.slice(from, to));
    expect(fn.integrate()).toBe(0);
    expect(fn.integrate(from, to)).toBe(0);

    // Constant positive function
    f = Array.from({ length }, () => 1);
    fn = new TabularFunction(f, x);
    expect(fn.length).toBe(length);
    expect(fn.f).toEqual(f);
    expect(fn.x).toEqual(x);
    expect(fn.slice(0)).toEqual(fn);
    expect(fn.slice(from, to).f).toEqual(f.slice(from, to));
    expect(fn.slice(from, to).x).toEqual(x.slice(from, to));
    expect(fn.integrate()).toBe(2 * (length - 1));
    expect(fn.integrate(from, to)).toBe((x[to - 1] - x[from]));

    // Concat method
    fn2 = fn.slice(0); // create copy
    let fnConcatfn2 = fn.concat(fn2);
    expect(fn.f).toEqual(f);
    expect(fn.x).toEqual(x);
    expect(fnConcatfn2.f).toEqual(f.concat(f));
    expect(fnConcatfn2.x).toEqual(x.concat(x));

    // Constant negative function
    f = Array.from({ length }, () => -1);
    fn = new TabularFunction(f, x);
    expect(fn.integrate()).toBe(-2 * (length - 1));
    expect(fn.integrate(from, to)).toBe(-(x[to - 1] - x[from]));

    // Linear function
    f = Array.from({ length }, (_, i) => i);
    fn = new TabularFunction(f, x);
    expect(fn.length).toBe(length);
    expect(fn.f).toEqual(f);
    expect(fn.x).toEqual(x);
    expect(fn.slice(0)).toEqual(fn);
    expect(fn.slice(from, to).f).toEqual(f.slice(from, to));
    expect(fn.slice(from, to).x).toEqual(x.slice(from, to));
    expect(fn.integrate()).toBe((length - 1) * (length - 1));
    expect(fn.integrate(from, to)).toBe(0.5 * (f[to - 1] + f[from]) * (x[to - 1] - x[from]));
});
