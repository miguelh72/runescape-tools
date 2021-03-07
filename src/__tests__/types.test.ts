import { Skill, Timeframe } from "../types";

test('Skill enumeration', () => {
    expect(Skill.overall).toEqual(0);
    expect(Skill[0]).toEqual('overall');

    expect(Skill.constitution).toEqual(4);
    expect(Skill[4]).toEqual('constitution');

    expect(Skill.archaeology).toEqual(28);
    expect(Skill[28]).toEqual('archaeology');
});

test('Timeframe enumeration', () => {
    expect(Timeframe.alltime).toEqual(0);
    expect(Timeframe[0]).toEqual('alltime');

    expect(Timeframe.weekly).toEqual(1);
    expect(Timeframe[1]).toEqual('weekly');

    expect(Timeframe.monthly).toEqual(2);
    expect(Timeframe[2]).toEqual('monthly');
});
