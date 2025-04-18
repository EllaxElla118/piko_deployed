const puppeteer = require('puppeteer');
const { execSync } = require('child_process');
const fs = require('fs');

async function dl(animeid, episode_number) {
  return new Promise(async (resolve, reject) => {
    try {
      const browser = await puppeteer.launch({
        headless: true,
        executablePath: '/usr/bin/google-chrome-stable',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox'
        ]
      });
      const page = await browser.newPage();

      await page.setRequestInterception(true);

      let videoUrl = '';
      let isProcessed = false; // Prevent processing multiple requests

      page.on('request', async (request) => {
        const url = request.url();

        // Target 'index-****.m3u8' pattern
        if (url.match(/\/index-[^/]*\.m3u8($|\?)/i) && !isProcessed) {
          isProcessed = true;
          videoUrl = url;
          console.log(`Found m3u8 URL: ${videoUrl}`);
          // Abort to prevent loading the m3u8 file in the browser
          request.abort();

          try {/*
            const response = await fetch(videoUrl);
            const playlistContent = await response.text();
            // Generate a unique filename for the playlist
            const playlistFilename = `playlist-${Math.floor(Math.random() * 10e6)}.m3u8`;
            fs.writeFileSync(playlistFilename, playlistContent);
            // Process the video using ffmpeg
            execSync(`ffmpeg -y -protocol_whitelist "file,http,https,tcp,tls" -i "${playlistFilename}" "${playlistFilename}.mp4"`);
            console.log('Video processed successfully.');
            resolve(`${playlistFilename}.mp4`);*/
            var m3u8ToMp4 = require("m3u8-to-mp4");
            var converter = new m3u8ToMp4();
            const playlistFilename = `playlist-${Math.floor(Math.random() * 10e6)}.mp4`;
            await converter
            .setInputFile(videoUrl)
            .setOutputFile(playlistFilename)
            .start();        
            console.log("File converted");
            let aniOuput = `Vid-${Math.floor(Math.random() * 10e6)}.mp4`;
            execSync(`ffmpeg -i ${playlistFilename}.mp4 -vf "scale=-2:360" -vcodec libx264 -crf 28 -preset slow -c:a aac -b:a 64k -movflags +faststart ${aniOuput}`);
            fs.unlinkSync(playlistFilename);
            resolve(aniOuput);
          } catch (error) {
            console.error('Error processing video:', error);
            reject(error);
          } finally {
            await browser.close();
          }
        } else {
          request.continue();
        }
      });
      console.log(`https://ww30.gogoanimes.fi/${animeid}-episode-${episode_number}`);
      await page.goto(`https://ww30.gogoanimes.fi/${animeid}-episode-${episode_number}`, { timeout: 0, waitUntil: 'domcontentloaded' });

      // Retrieve the iframe URL if available
      let link = await page.evaluate(() => {
        const iframe = document.querySelector('iframe');
        return iframe ? iframe.src : null;
      });
      if (link) {
        console.log(`Navigating to iframe URL: ${link}`);
        await page.goto(link, { timeout: 0 });
      } else {
        console.log('No iframe found on the page.');
      }
    } catch (e) {
      reject(e);
    }
  });
}

module.exports = dl;
