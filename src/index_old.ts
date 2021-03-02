import Nightmare from 'nightmare';
import cheerio from 'cheerio';
import { parse } from 'node-html-parser';

const nightmare = new Nightmare({ show: true, waitTimeout: 10000 });
const url = 'http://secure.runescape.com/m=hiscore/ranking?category_type=0&table=1&date=1614657652242&time_filter=1&page=1'; //'https://news.ycombinator.com';

// Request making using nightmare
nightmare
    .goto(url)
    .wait('body')
    .evaluate(() => document.documentElement.outerHTML)
    .end()
    .then((response: string) => {
        console.log(getData(response));
    }).catch(err => {
        console.log(err);
    });

// Parsing data using cheerio
function getData(html: string) {
    let doc = parse(html);

    console.log({
        //doc: doc.structure,
        title: doc.querySelector('title').text,
        body: doc.querySelectorAll('div.tableWrap table')[1].querySelectorAll('tr').forEach((tr) => {
            console.log(tr.querySelectorAll('td')[1].text.trim());
        }),
    });
}