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

async function aniinfo(id) {
  const url = `https://www31.gogoanimes.fi/category/${id}`;
  console.log(`[Aniinfo] Fetching info for: ${id}`);
  console.log(`[Aniinfo] URL: ${url}`);

  let page;
  try {
    const browser = await getBrowser();
    page = await browser.newPage();

    // Set realistic viewport and user agent
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // Navigate with proper timeout
    await page.goto(url, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    console.log(`[Aniinfo] Page loaded successfully`);

    // Wait for main content
    await page.waitForSelector('.anime_info_body_bg', { timeout: 10000 });

    // Extract anime information
    const result = await page.evaluate(() => {
      const typeElements = document.querySelectorAll('.anime_info_body_bg p.type');
      
      if (!typeElements || typeElements.length === 0) {
        return { success: false, error: 'Could not fetch anime info' };
      }

      const imgElement = document.querySelector('.anime_info_body_bg img');
      const episodeElement = document.querySelector('#episode_related')?.firstElementChild?.querySelector('.name');

      return {
        success: true,
        name: imgElement?.nextElementSibling?.innerText?.trim() || 'Unknown',
        coverlink: imgElement?.src || '',
        description: typeElements[1]?.innerText?.replace('Plot Summary: ', '').trim() || 'No description available',
        type: typeElements[0]?.innerText?.replace('Type: ', '').trim() || 'Unknown',
        genre: Array.from(typeElements[6]?.querySelectorAll('a') || [])
          .map(a => a.innerText.trim())
          .join(', ') || 'Unknown',
        updated: typeElements[3]?.innerText?.replace('Updated: ', '').trim() || 'Unknown',
        released: typeElements[2]?.innerText?.replace('Released: ', '').trim() || 'Unknown',
        status: typeElements[4]?.innerText?.replace('Status: ', '').trim() || 'Unknown',
        other_name: typeElements[5]?.innerText?.replace('Other name: ', '').trim() || 'None',
        ep_end: episodeElement?.innerText?.replace('EP ', '').trim() || null
      };
    });

    await page.close();

    console.log(`[Aniinfo] Successfully fetched info for: ${result.name}`);
    return result;

  } catch (error) {
    if (page) await page.close().catch(() => {});
    
    console.error(`[Aniinfo] Error: ${error.message}`);
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

process.on('SIGINT', async () => {
  if (browser) await browser.close();
  process.exit();
});

process.on('SIGTERM', async () => {
  if (browser) await browser.close();
  process.exit();
});

module.exports = { aniinfo };