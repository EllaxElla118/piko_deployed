const cloudscraper = require('cloudscraper');
const { JSDOM } = require('jsdom');

async function anisearch(name) {
  const url = `https://www13.gogoanimes.fi/search.html?keyword=${encodeURIComponent(name)}`;
  console.log(`[Anisearch] Searching for: ${name}`);
  console.log(`[Anisearch] URL: ${url}`);

  try {
    const html = await cloudscraper.get({
      uri: url,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 15000
    });

    console.log(`[Anisearch] Page loaded successfully`);

    const dom = new JSDOM(html);
    const document = dom.window.document;

    const el = document.querySelector('ul.items');
    if (!el) {
      console.warn(`[Anisearch] No results found.`);
      return { success: false };
    }

    const results = Array.from(el.children).map(x => ({
      text: x.querySelector('p.name')?.textContent.trim() || 'No Name',
      animeID: x.querySelector('a')?.href.split('/').pop() || null
    }));

    console.log(`[Anisearch] Found ${results.length} result(s).`);
    return { success: true, results };

  } catch (error) {
    console.error(`[Anisearch] Error: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = { anisearch };