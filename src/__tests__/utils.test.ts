import { getExpPage, integrate, isInTesting, pause, TabularFunction } from "../utils";
import { expGainPageExample, internetingishardPage, notEnoughPlayersPageExample } from "./results";

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
    fn2.addDatapoint(99, -1);
    expect(fn2.x[0]).toEqual(-1);
    expect(fn2.f[0]).toEqual(99);
    fn2.addDatapoint(77, 99);
    expect(fn2.x[fn2.length - 1]).toEqual(99);
    expect(fn2.f[fn2.length - 1]).toEqual(77);

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

test('Interpolate TabularFunction', () => {
    let length = 4;
    let x = Array.from({ length }, (_, i) => 2 * (i + 1));
    let f = Array.from({ length }, (_, i) => i + 1);

    // rightshift method:
    let fn = new TabularFunction(f, x);
    // Trivial
    let fnResult = fn.interpolate([], 'rightshift');
    expect(fnResult.x).toEqual(x);
    expect(fnResult.f).toEqual(f);
    // At begining case
    x = [-1, 0]
    fnResult = fn.interpolate(x, 'rightshift');
    expect(fnResult.x).toEqual([-1, 0, 2, 4, 6, 8]);
    expect(fnResult.f).toEqual([1, 1, 1, 2, 3, 4]);
    // Whithin function case
    x = [3, 4, 5]
    fnResult = fn.interpolate(x, 'rightshift');
    expect(fnResult.x).toEqual([2, 3, 4, 5, 6, 8]);
    expect(fnResult.f).toEqual([1, 1, 2, 2, 3, 4]);
    // At end case
    x = [9, 10]
    fnResult = fn.interpolate(x, 'rightshift');
    expect(fnResult.x).toEqual([2, 4, 6, 8, 9, 10]);
    expect(fnResult.f).toEqual([1, 2, 3, 4, 4, 4]);
    // Full wrapping case
    x = Array.from({ length: (length + 2) * 2 }, (_, i) => i);
    fnResult = fn.interpolate(x, 'rightshift');
    expect(fnResult.x).toEqual(x);
    expect(fnResult.f).toEqual([1, 1, 1, 1, 2, 2, 3, 3, 4, 4, 4, 4]);

    // linear method
    fn = new TabularFunction([2, 4, 6, 8], [2, 4, 6, 8]);
    // Trivial
    fnResult = fn.interpolate([], 'linear');
    expect(fnResult.x).toEqual([2, 4, 6, 8]);
    expect(fnResult.f).toEqual([2, 4, 6, 8]);
    // At begining case
    x = [0, 1]
    fnResult = fn.interpolate(x, 'linear');
    expect(fnResult.x).toEqual([0, 1, 2, 4, 6, 8]);
    expect(fnResult.f).toEqual([2, 2, 2, 4, 6, 8,]);
    // Whithin function case
    x = [3, 4, 5]
    fnResult = fn.interpolate(x, 'linear');
    expect(fnResult.x).toEqual([2, 3, 4, 5, 6, 8]);
    expect(fnResult.f).toEqual([2, 3, 4, 5, 6, 8]);
    // At end case
    x = [9, 10]
    fnResult = fn.interpolate(x, 'linear');
    expect(fnResult.x).toEqual([2, 4, 6, 8, 9, 10]);
    expect(fnResult.f).toEqual([2, 4, 6, 8, 8, 8]);
    // Full wrapping case
    x = Array.from({ length: (length + 2) * 2 }, (_, i) => i);
    fnResult = fn.interpolate(x,); // linear is default
    expect(fnResult.x).toEqual(x);
    expect(fnResult.f).toEqual([2, 2, 2, 3, 4, 5, 6, 7, 8, 8, 8, 8]);
});

test('Converting TabularFunction to string JSON and back', () => {
    let length = 10;
    let x = Array.from({ length }, (_, i) => 2 * (i + 1));
    let f = Array.from({ length }, (_, i) => i + 1);
    let fn = new TabularFunction(f, x);
    let stringFn = JSON.stringify(fn);
    let recoveredFn = TabularFunction.fromObject(JSON.parse(stringFn));
    expect(recoveredFn.x).toEqual(fn.x);
    expect(recoveredFn.f).toEqual(fn.f);
});

test('Convert HtmlPage to ExpPage', () => {
    // Case page doesnt have data
    let expPage = getExpPage(notEnoughPlayersPageExample);
    expect(expPage).toEqual({ url: notEnoughPlayersPageExample.url, exp: 0, periodStart: 1610739396557, pageNum: 3001, hasData: false })

    // Case page has data
    expPage = getExpPage(expGainPageExample);
    expect(expPage).toEqual({ url: expGainPageExample.url, exp: 83110129, periodStart: 1610739396557, pageNum: 3001, hasData: true })

    // Case page is not experience page
    expect(() => expPage = getExpPage(internetingishardPage)).toThrowError();
});
/*
test('\nVISUAL INSPECTION REQUIRED\nPlot linear TabularFunction', () => {
    let length = 11;
    let x = Array.from({ length }, (_, i) => 2 * i);
    let f = Array.from({ length }, (_, i) => i);
    let fn = new TabularFunction(f, x);
    fn.plot({ title: 'Linear function with 0.5 slope', xLegend: 'x-axis legend', yLegend: 'y-axis legend' });
})
*/