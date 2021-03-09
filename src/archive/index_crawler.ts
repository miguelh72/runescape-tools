import Crawler from 'crawler';

let c = new Crawler({
    rateLimit: 1000,
    headers: {
        'Referer': 'http://www.grandexchangecentral.com',
    },
    jQuery: false,
    // This will be called for each crawled page
    callback: function (error, res, done) {
        if (error) {
            console.error(error);
        } else {
            //console.log({ body: JSON.parse(res.body as string) }); // TODO rm
            console.log({ html: res.body })

            // $ is Cheerio by default
            //var $ = res.$;

            //a lean implementation of core jQuery designed specifically for the server
            /*console.log({
                title: $("title").text(),
                body: $('body').text()
            });*/

        }
        done();
    }
});

c.queue([
    {
        uri: 'http://www.grandexchangecentral.com/include/gecgraphjson.php?jsid=2',
        proxy: 'http://37.120.133.135:3128'
    },
]);