const express = require('express');
const fs = require('fs');
const puppeteer = require("puppeteer");
const async = require("async");
const {last, initializeArrayWithRange} = require("../helpers/helpers");
const router = express.Router();

const getPageData = async(browser, pageNum, callback) => {
  console.log(`loading page ${pageNum} `);
  const link = `https://cdp.pl/planszowe.html?dir=asc&mode=grid&order=name&p=${pageNum}`;
  const page = await browser.newPage();
  try {
    await page.setViewport({ width: 1199, height: 900 });
    await page.goto(link);
    await page.waitFor('.products');
    const productsData = await page.evaluate(() => {
      let tmp = [];
      const products = Array.from(document.querySelectorAll('.products > li'));
      products.map(product => {
        const href = product.querySelector('h3 > a');
        tmp.push({
          id: product.getAttribute('data-product').split(',')[0].slice(1),
          url: href.getAttribute('href'),
          name: href.getAttribute('title'),
          prices: Array.from(product.querySelectorAll('.custom_price'))
              .map(p => [p.innerText.slice(0, 2), p.innerText.slice(2)].join('.'))
        })
      });
      return tmp;
    });
    await page.close();
    console.log(`page ${pageNum} data loaded`);
    callback(null, productsData);
    // return productsData;
  } catch (error) {
    console.log(error, null);
    return [];
  }
}

const getMaxPages = async (browser) => {
  const link = `https://cdp.pl/planszowe.html?dir=asc&mode=grid&order=name&p=1`;
  let maxPage = 1;

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1199, height: 900 });
    await page.goto(link);

    await page.waitFor(1000);
    const lastPageUrl = await page.$eval('.last-page', node => node.getAttribute('href'));
    maxPage = parseInt(last(lastPageUrl.split('&')).split('=')[1]);
    await page.close();

    return maxPage
  } catch (error) {
    console.log(error);
    return maxPage;
  }
}

const scrapePage = async () => {
  const hrstart = process.hrtime();
  const browser = await puppeteer.launch({ headless: true, slowMo: 100, devtools: true });
  let maxPage = await getMaxPages(browser);
  let items = [];
  let pages = initializeArrayWithRange(maxPage - 1, 1);
  const pageRequests = pages.map(p => async.reflect(callback => {getPageData(browser,p, callback)}));
  await fs.truncate('./data/cdp.json', 0, function(){console.log('done')})
  async.parallelLimit(pageRequests, 10, (err, results) => {
    fs.appendFile('./data/cdp.json', '[\n', () => {});
      results.map(r => {
        let data = JSON.stringify(r.value, null, 2).slice(1,-1);
        fs.appendFile('./data/cdp.json', `,${data}\n`, (err) => {
          if (err) throw err;
          console.log('Data written to file');
        });
      });
    fs.appendFile('./data/cdp.json', '\n]',() => {});
    const hrend = process.hrtime(hrstart);
    console.info('Execution time (hr): %ds %dms', hrend[0], hrend[1] / 1000000);
  });
  return true;
}

router.get('/', async (req, res, next) => {
  scrapePage();
  res.send('Scraping CDP started');
});

module.exports = router;
