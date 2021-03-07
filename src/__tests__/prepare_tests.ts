import crawler from '../crawler';
import persistence from '../persistence';
import { Skill } from '../types';
import { warning } from '../utils';
import { internetingishard } from './results';

// Prepare for crawler.test.ts
//crawler.getSkillWeeklyExpGainHtmlPages(Skill.runecrafting);

(async () => {
    let success = false;
    while (!success) {
        await crawler.getAllExpGainHtmlPages()
            .then(async () => {
                await persistence.verifyDatabaseIntegrity();
                success = true;
            })
            .catch((err: Error) => {
                console.log(warning('\n' + err.message));
            });
    }
})();

/*
(async () => {
    const page = await crawler.loadHtmlPage(internetingishard.url, true);
    console.log(page)
})();
*/