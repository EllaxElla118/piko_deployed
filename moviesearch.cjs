const puppeteer = require('puppeteer');

async function moviesearch(name) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000); // 5s timeout

  const url = `https://o2tvseries.xyz/?s=${encodeURIComponent(name)}`;
  let browser;
    try {
      browser = await puppeteer.launch({
        headless: true,
        executablePath: '/usr/bin/google-chrome-stable',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox'
        ]
      });
      const page = await browser.newPage();
      await page.goto(url, { timeout: 0, waitUntil: 'domcontentloaded' });
      let result = await page.evaluate(()=>{
        let c = document.querySelectorAll('article');
        if (!c.length) return { success: false, error: 'Couldn\'t fetch movies' };

        let results = Array.from(c).map(val => ({
            name: val.querySelector('h3')?.innerText || 'Unknown',
            id: val.querySelector('a')?.href.replace('https://o2tvseries.xyz/', '').split('/').join('') || 'Unknown'
        }));
        return results
      });
      console.log(result);
      return result;
} catch (error) {
  return { success: false, error }
} finally {
  await browser.close();
}
}

module.exports = moviesearch;