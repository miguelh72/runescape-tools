import crawler from './crawler';
import grandexchange from './grandexchange';
import persistence from './persistence';
import { warning } from './utils';

(async () => {
    // Prepare for crawler.test.ts
    let success = false;
    while (!success) {
        await crawler.getAllWeeklyExpPages()
            .then(async () => {
                await persistence.verifyDatabaseIntegrity();
                success = true;
            })
            .then(() => console.log())
            .catch((err: Error) => {
                console.log(warning('\n' + err.message));
            });
    }

    // Prepare for persistence.test.ts and grandexchange.tests.ts
    await grandexchange.buildItemList();
})();
