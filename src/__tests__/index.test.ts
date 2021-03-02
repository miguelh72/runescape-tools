import Crawler from 'crawler';

test('Test crawling highscore\'s first two pages.', () => {
    let c = new Crawler({
        rateLimit: 1000,
        // This will be called for each crawled page
        callback: function (error, res, done) {
            if (error) {
                console.error(error);
            } else {
                // $ is Cheerio by default
                var $ = res.$;

                //a lean implementation of core jQuery designed specifically for the server
                console.log({
                    title: $("title").text(),
                    body: $('body').text()
                });

            }
            done();
        }
    });

    c.queue(['https://runescape.wiki/w/Adamant_full_helm', 'https://runescape.wiki/w/Adamant_2h_sword']);
});