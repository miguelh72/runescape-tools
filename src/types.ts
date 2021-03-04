export type Skill = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28;
export interface KeyValueSet<M> {
    [key: string]: M
}
export const skill = {
    overall: 0 as Skill,
    attack: 1 as Skill,
    defense: 2 as Skill,
    strength: 3 as Skill,
    constitution: 4 as Skill,
    ranged: 5 as Skill,
    prayer: 6 as Skill,
    magic: 7 as Skill,
    cooking: 8 as Skill,
    woodcutting: 9 as Skill,
    fletching: 10 as Skill,
    fishing: 11 as Skill,
    firemaking: 12 as Skill,
    crafting: 13 as Skill,
    smithing: 14 as Skill,
    mining: 15 as Skill,
    herblore: 16 as Skill,
    agility: 17 as Skill,
    thieving: 18 as Skill,
    slayer: 19 as Skill,
    farming: 20 as Skill,
    runecrafting: 21 as Skill,
    hunter: 22 as Skill,
    construction: 23 as Skill,
    summoning: 24 as Skill,
    dungeoneering: 25 as Skill,
    divination: 26 as Skill,
    invention: 27 as Skill,
    archaeology: 28 as Skill,
}
const skillNameMap: string[] = new Array<string>(28);
for (const [skillName, skillNum] of Object.entries(skill)) {
    skillNameMap[skillNum] = skillName;
}
export function getSkillName(sk: Skill) {
    if (sk === undefined || sk < 0 || sk > 28) { throw new RangeError('Skill must be a numerical value between 0 and 28, inclusively.'); }
    return skillNameMap[sk];
}

export type Timeframe = 0 | 1 | 2;
export const timeframe = {
    alltime: 0 as Timeframe,
    weekly: 1 as Timeframe,
    monthly: 2 as Timeframe,
}

