const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const { JSDOM } = require('jsdom');
const iconv = require('iconv-lite');

async function aniinfo(id) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000); // 5s timeout

  const url = `https://ww30.gogoanimes.fi/category/${encodeURIComponent(id)}`;

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
    console.log(`[aniinfo] HTTP Status: ${response.status}`);

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const buffer = await response.buffer(); // get raw bytes
    const html = iconv.decode(buffer, 'utf-8'); // decode manually
    const dom = new JSDOM(html);
    const document = dom.window.document;
    let c = document.querySelectorAll('html body div#wrapper_inside div#wrapper div#wrapper_bg section.content section.content_left div.main_body div.anime_info_body div.anime_info_body_bg p.type');
    if(!c) return { success: false, error: 'Couldnt fetch anime info' }
    let res = {
      name: document.querySelector('html body div#wrapper_inside div#wrapper div#wrapper_bg section.content section.content_left div.main_body div.anime_info_body div.anime_info_body_bg img').nextElementSibling.innerText,
      id: id,
      coverlink: `https://ww30.gogoanimes.fi${document.querySelector('html body div#wrapper_inside div#wrapper div#wrapper_bg section.content section.content_left div.main_body div.anime_info_body div.anime_info_body_bg img').src}`,
      description: document.querySelector('.description').innerText || undefined,
      type: c[0].innerText.replace('Type: ', '') || undefined,
      genre: c[2].innerText.replace('Genre: ', '') || undefined,
      released: c[3].innerText.replace('Released: ', ''),
      status: c[4].innerText.replace('Status: ', '') || undefined,
      other_name: c[5].innerText.replace('Other name: ', ''),
      ep_end: document.querySelector('#episode_page').lastElementChild.querySelector('a').getAttribute('ep_end')
    }
    return { success: true, res };

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

module.exports = { aniinfo };
