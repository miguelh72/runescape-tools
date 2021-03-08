import crawler from '../crawler';
import persistence from '../persistence';
import { Skill } from '../types';
import { warning } from '../utils';

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
