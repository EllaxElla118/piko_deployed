const puppeteer = require('puppeteer');

let browser = null;

async function getBrowser() {
  if (!browser) {
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });
  }
  return browser;
}

async function anisearch(name) {
  const url = `https://www13.gogoanimes.fi/search.html?keyword=${encodeURIComponent(name)}`;
  console.log(`[Anisearch] Searching for: ${name}`);
  console.log(`[Anisearch] URL: ${url}`);

  let page;
  try {
    const browser = await getBrowser();
    page = await browser.newPage();

    // Set realistic viewport and user agent
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // Navigate with timeout
    await page.goto(url, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    console.log(`[Anisearch] Page loaded successfully`);

    // Wait for results
    await page.waitForSelector('ul.items', { timeout: 10000 }).catch(() => null);

    // Extract results
    const results = await page.evaluate(() => {
      const el = document.querySelector('ul.items');
      if (!el) return null;

      return Array.from(el.children).map(x => ({
        text: x.querySelector('p.name')?.textContent.trim() || 'No Name',
        animeID: x.querySelector('a')?.href.split('/').pop() || null
      }));
    });

    await page.close();

    if (!results || results.length === 0) {
      console.warn(`[Anisearch] No results found.`);
      return { success: false };
    }

    console.log(`[Anisearch] Found ${results.length} result(s).`);
    return { success: true, results };

  } catch (error) {
    if (page) await page.close().catch(() => {});
    
    console.error(`[Anisearch] Error: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

// Clean up browser on process exit
process.on('exit', async () => {
  if (browser) await browser.close();
});

module.exports = { anisearch };