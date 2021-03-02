import Crawler from 'crawler';

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

c.queue([
    'http://secure.runescape.com/m=hiscore/ranking?category_type=0&table=1&date=1614657652242&time_filter=1&page=1',
    //'https://secure.runescape.com/m=hiscore/ranking?category_type=0&table=1&date=1614657652242&time_filter=1&page=2'
]);