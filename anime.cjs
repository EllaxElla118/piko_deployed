const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const { JSDOM } = require('jsdom');
const iconv = require('iconv-lite');

async function anisearch(name) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000); // 5s timeout

  const url = `https://ww30.gogoanimes.fi/search.html?keyword=${encodeURIComponent(name)}`;
  console.log(`[Anisearch] Searching for: ${name}`);
  console.log(`[Anisearch] URL: ${url}`);

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept': 'text/html',
        'Accept-Encoding': 'identity', // disable gzip/br to avoid decoding errors
      },
      signal: controller.signal,
      redirect: 'follow',
    });

    clearTimeout(timeout);
    console.log(`[Anisearch] HTTP Status: ${response.status}`);

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const buffer = await response.buffer(); // get raw bytes
    const html = iconv.decode(buffer, 'utf-8'); // decode manually
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
    clearTimeout(timeout);
    if (error.name === 'AbortError') {
      console.error(`[Anisearch] Request timed out.`);
    } else {
      console.error(`[Anisearch] Error: ${error.message}`);
    }
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = { anisearch };
