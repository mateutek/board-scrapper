const express = require('express');
const fs = require('fs');
const puppeteer = require("puppeteer");
const async = require("async");
const {last, initializeArrayWithRange, replaceName} = require("../helpers/helpers");
const router = express.Router();


const getPageData = async(browser, pageNum, callback) => {
  console.log(`loading page ${pageNum} `);
  const link = `https://www.gandalf.com.pl/px/,12322-12804-11356-11364-11355-11982-12045-12803-11358-12631-12802-12845-11360-11361-11362-11365,,,,,,0-500000/bab${pageNum}/`;
  const page = await browser.newPage();
  try {
    await page.setViewport({ width: 1199, height: 900 });
    await page.goto(link);
    await page.waitFor('.products-list-wrapper');
    const productsData = await page.evaluate(() => {
      let tmp = [];
      const products = Array.from(document.querySelectorAll('#list-of-filter-products > ul > li'));
      products.map(product => {
        const href = product.querySelector('.title');
        tmp.push({
          id: href.getAttribute('id'),
          url: href.getAttribute('href'),
          name: href.getAttribute('title'),
          prices: [
              parseFloat(product.querySelector('.old-price').innerText),
              parseFloat(product.querySelector('.current-price').innerText.replace(',','.'))
          ],
          author: product.querySelector('.author').getAttribute('title')
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
  const link = `https://www.gandalf.com.pl/px/,12322-12804-11356-11364-11355-11982-12045-12803-11358-12631-12802-12845-11360-11361-11362-11365,,,,,,0-500000/bab0/`;
  let maxPage = 0;

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1199, height: 900 });
    await page.goto(link);

    await page.waitFor(1000);
    maxPage = await page.$eval('.max-pages', node => node.innerText);
    await page.close();
    console.info(` FOUND ${maxPage} pages to scrap`);
    return maxPage
  } catch (error) {
    console.log(error);
    return maxPage;
  }
}

const scrapePage = async () => {
  const hrstart = process.hrtime();
  const browser = await puppeteer.launch({ headless: true, slowMo: 100, devtools: true });

  const dataFilePath = './data/gandalf.json';
  let maxPage =  await getMaxPages(browser);
  let items = [];
  let pages = initializeArrayWithRange(maxPage, 0);
  const pageRequests = pages.map(p => async.reflect(callback => {getPageData(browser,p, callback)}));
  await fs.truncate(dataFilePath, 0, function(){console.log('done')})
  async.parallelLimit(pageRequests, 10, (err, results) => {
    fs.appendFile(dataFilePath, '[\n', () => {});
    results.map(r => {
      r.value.forEach(p => {
        p.name = replaceName(p.name, p.author).trimEnd()
      });
      let data = JSON.stringify(r.value, null, 2).slice(1,-1);
      fs.appendFile(dataFilePath, `,${data}\n`, (err) => {
        if (err) throw err;
        console.log('Data written to file');
      });
    });
    fs.appendFile(dataFilePath, '\n]',() => {});
    const hrend = process.hrtime(hrstart);
    console.info('Execution time (hr): %ds %dms', hrend[0], hrend[1] / 1000000);
  });
  return true;
}

router.get('/', async (req, res, next) => {
  scrapePage();
  res.send('Scraping Gandalf started');
});

module.exports = router;
