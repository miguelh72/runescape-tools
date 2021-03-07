import fs from 'fs';
import chalk from 'chalk';
import { parse, HTMLElement } from 'node-html-parser';
import { Skill } from './types';




async function update(sk: Skill, rateLimitPeriod?: number): Promise<boolean> {
    const skillName = getSkillName(sk as Skill);
    console.log('Working on skill: ' + chalk.bold(skillName));
    return loadSkill(sk, rateLimitPeriod).then(result => {
        if (!result) { console.log(error(`\nFailed to update ${skillName} skill.`)) }
        return result;
    });
}

async function updateAll(rateLimitPeriod?: number): Promise<boolean> {
    const results: boolean[] = [];
    for (const [_, skillNum] of Object.entries(skill)) {
        results.push(await update(skillNum, rateLimitPeriod));
    }
    const loadedAll = results.reduce((acc, res) => acc && res);

    console.log('Verifying datastore integrity.');
    if (!(await verifyDatabaseIntegrity())) {
        console.log(error('Datastore is not valid.'));
    }
    if (!loadedAll) {
        console.log(error('Could not update all skills.'));
    } else {
        console.log(ok('All skills are up to date.'));
    }
    return loadedAll;
}

function getTotalExp(highscorePage: HTMLElement): number {
    if (highscorePage.querySelectorAll('div.tableWrap') === null) { throw new Error('Page did not contain users.'); }

    return highscorePage
        .querySelectorAll('div.tableWrap table')[1]
        .querySelectorAll('tr')
        .map((tr) => parseInt(tr.querySelectorAll('td')[2].text.trim().replace(/[,]/g, '')))
        .reduce((acc, exp) => acc + exp);
}

function decomposeURL(URL: string): { startTime: number, pgNum: number } {
    const startTimeIndex = URL.indexOf('date=') + 5;
    const startTime = parseInt(URL.slice(startTimeIndex, startTimeIndex + 13));

    const pgNumIndex = URL.indexOf('page=') + 5;
    const pgNum = parseInt(URL.slice(pgNumIndex, URL.length));

    return { startTime, pgNum };
}



function getExpGains(): { startTime: number; totalExp: number; }[][] {
    const skillsExpGain: { startTime: number; totalExp: number; }[][] = new Array(28);
    for (const [skillName, skillNum] of Object.entries(skill)) {
        const oneWeekBeforeToday = Date.now() - WEEK_TIMELAPSE;
        const startOfWeeks = [CRAWL_WEEK_START];
        while (startOfWeeks[startOfWeeks.length - 1] + WEEK_TIMELAPSE < oneWeekBeforeToday) {
            startOfWeeks.push(startOfWeeks[startOfWeeks.length - 1] + WEEK_TIMELAPSE);
        }

        const weeklyTotalExp = startOfWeeks.map((weekStart: number) => {
            const weeklyURLSet = getHighscoreURLSet(skillNum, timeframe.weekly, weekStart)
                .reduce((acc: string[], URL: string): string[] => {
                    if (!NotEnoughPlayers.contains(URL)) {
                        acc.push(URL);
                    }
                    return acc;
                }, [])

            const expPerPgNum = weeklyURLSet
                .map(URL => DATASTORE_FOLDER + '/' + skillName + '/' + getFilenameFromURL(URL))
                .map(filepath => fs.readFileSync(filepath, 'utf8'))
                .map(html => parse(html))
                .map((htmlElem, index) => {
                    const result = decomposeURL(weeklyURLSet[index]) as { startTime: number, pgNum: number, exp: number };
                    result.exp = getTotalExp(htmlElem);
                    return result;
                });

            let integral = 0;
            for (let i = 0; i < expPerPgNum.length - 1; i++) {
                integral += 0.5 * (expPerPgNum[i + 1].exp + expPerPgNum[i].exp) * (expPerPgNum[i + 1].pgNum - expPerPgNum[i].pgNum);
            }
            if (isDoubleExpWeek(weekStart)) {
                integral /= 2;
            }

            return { startTime: expPerPgNum[0].startTime, totalExp: integral };
        });

        skillsExpGain[skillNum] = weeklyTotalExp;
    }
    return skillsExpGain;
}

const expGain = getExpGains()[skill.runecrafting]
console.log(expGain);
const st = [], te = [];
expGain.forEach(({ startTime, totalExp }) => { st.push(startTime); te.push(totalExp) });

st.forEach(v => console.log(v));
te.forEach(v => console.log(v));

//(async () => console.log(await verifyDatabaseIntegrity()))();
//updateAll(0);

/**
 * TODO list
 * - Take into account double exp weeks, full list available in wiki.
 */