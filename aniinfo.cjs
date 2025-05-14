const puppeteer = require('puppeteer');

async function aniinfo(id) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000); // 5s timeout

  const url = `https://www31.gogoanimes.fi/category/${id}`;
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
        let c = document.querySelectorAll('html body div#wrapper_inside div#wrapper div#wrapper_bg section.content section.content_left div.main_body div.anime_info_body div.anime_info_body_bg p.type');
          if(!c) return { success: false, error: 'Couldnt fetch anime info' }
          let res = {
      success: true,
      name: document.querySelector('html body div#wrapper_inside div#wrapper div#wrapper_bg section.content section.content_left div.main_body div.anime_info_body div.anime_info_body_bg img')?.nextElementSibling?.innerText,
      coverlink: `${document.querySelector('html body div#wrapper_inside div#wrapper div#wrapper_bg section.content section.content_left div.main_body div.anime_info_body div.anime_info_body_bg img').src}`,
      description: `${c[1]?.innerText?.replace('Plot Summary: ', '')}` || undefined,
      type: `${c[0]?.innerText?.replace('Type: ', '')}` || undefined,
      genre: `${Array.from(c[6]?.querySelectorAll('a')).map(t=>t?.innerText).join(', ')}` || undefined,
      updated: `${c[3]?.innerText?.replace('Updated: ', '')}` || undefined,
      released: `${c[2]?.innerText?.replace('Released: ', '')}` || undefined,
      status: `${c[4]?.innerText?.replace('Status: ', '')}` || undefined,
      other_name: `${c[5]?.innerText?.replace('Other name: ', '')}` || undefined,
      ep_end: document.querySelector('#episode_related')?.firstElementChild?.querySelector('.name')?.innerText?.replace('EP ','')
        }
        return res
      });
      console.log(result);
      return result;
} catch (error) {
  return { success: false, error }
} finally {
  await browser.close();
}
}

module.exports = { aniinfo };
