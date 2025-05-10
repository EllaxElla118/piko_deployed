const puppeteer = require('puppeteer');

async function moviesearch(name) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000); // 5s timeout

const url = `https://sflix.to/search/${name.split(' ').join('-')}`;

  let browser;
    try {
      browser = await puppeteer.launch({
        headless: false,
        executablePath: '/usr/bin/google-chrome-stable',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--ignore-certificate-errors'
        ]
      });
      const page = await browser.newPage();
      await page.goto(url, { timeout: 0, waitUntil: 'domcontentloaded' });
      let result = await page.evaluate(()=>{
        let c = document.querySelectorAll('.flw-item');
        if (!c.length) return { success: false, error: 'Couldn\'t fetch movies' };

        let results = Array.from(c).map(val => ({
            name: val.querySelector('.film-name')?.innerText || 'Unknown',
            id: val.querySelector('a')?.href.split('/').pop() || 'Unknown'
        }));
        return results
      });
      console.log(result);
      return {sucess: true, result};
} catch (error) {
  console.error(error);
  return { success: false, error }
}
}

module.exports = moviesearch