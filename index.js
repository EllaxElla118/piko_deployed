import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';
import sharp from 'sharp';
import pkg from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import mongoose from 'mongoose';
import { MongoStore } from 'wwebjs-mongo';
import puppeteer from 'puppeteer';
import dotenv from 'dotenv';
import { startCountdown } from './newaction.js';
const fsPromises = fs.promises;

import pdfGen from './pdf.js';
import { anisearch } from './anime.cjs';
import anidl from './anidl.cjs';
import { ytdl } from './downloader.cjs';
import chatFunction from './chat.cjs';
import removebg from './removebg.js'
import carbonize from './carbon.js'
import { aniinfo } from './aniinfo.cjs'
import moviesearch from './moviesearch.cjs'

const { Client, RemoteAuth, MessageMedia } = pkg;

dotenv.config();

// Connect to MongoDB
await mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
console.log('✅ Connected to MongoDB');

const store = new MongoStore({ mongoose });
const client = new Client({
  authStrategy: new RemoteAuth({
    store,
    backupSyncIntervalMs: 300_000,
  }),
  puppeteer: {
    headless: true,
    executablePath: puppeteer.executablePath(),
    args: ['--no-sandbox'],
  },
});

// Event listeners
client.on('qr', async qr => {
  console.log('📲 Scan this QR code:');
  let t = await client.requestPairingCode('2348128850525');
  console.log(t);
  //qrcode.generate(qr, { small: true });
});

let isReady = false;
let isAuthenticated = false;

client.on('authenticated', () => {
  if (!isAuthenticated) {
    console.log('🔐 Authenticated!');
    isAuthenticated = true;
  }
});

client.on('auth_failure', message =>
  console.error('❌ Authentication failure:', message)
);

// Command handler
client.on('message_create', async message => {
  if(message.body === '/ping') {
    message.reply('pong')
  }
});

client.on('ready', () => {
  console.log('Client is ready!');
});

client.initialize();

client.on('message', async msg => {
  async function bot_unreact() {
    if (botReacted) {
      await msg.react('');
    }
  }    
  async function bot_react() {
    await setState('typing', chat);
    await msg.react('⏳');
    botReacted = true;
  }
  let chat = await msg.getChat();
  let botReacted = false;
  try {
    if (msg.body.startsWith('/join ')) {
      await bot_react();
        const inviteCode = msg.body.split(' ')[1].replace("https://chat.whatsapp.com/", "");
        try {
          await client.acceptInvite(inviteCode);
          msg.reply('Joined the group!');
        } catch (e) {
          msg.reply("Couldn't join the group. Check the invite link and try again...");
        }
    } else if (msg.body === '/exit') {
      await bot_react();
      if (chat.isGroup) {
        await msg.reply("Bye👋👋😘️");
        chat.leave();
      } else {
        msg.reply('This command can only be used in a group!');
      }
    } else if (msg.body === '/admins') {
      await bot_react();
      if (chat.isGroup) {
        const admins = chat.participants.filter(participant => participant.isAdmin || participant.isSuperAdmin); 
        const adminList = admins.map(admin => `- +${admin.id._serialized.replace('@c.us', '')}`).join('\n');
        await msg.reply(`The admins are:\n${adminList}`);
      }    
    } else if (msg.body === '/tagadmins') {
      await bot_react();
      if (chat.isGroup) {
        let mentions = [];
        for (let participant of chat.participants) {
          if (participant.isAdmin || participant.isSuperAdmin) {
            mentions.push(participant.id._serialized);
          }
        }
        chat.sendMessage('@admins', { mentions });
      }    
    } else if (msg.body.startsWith('/promote ')) {
      await bot_react();
      if (chat.isGroup) {
        const number = msg.body.split(" ")[1].replace('+', '');
        await chat.promoteParticipants([number + '@c.us']);
        msg.reply(`${number} is now an admin`);
      }    
    } else if (msg.body.startsWith('/demote ')) {
      await bot_react();
      if (chat.isGroup) {
        const number = msg.body.split(" ")[1].replace('+', '');
        await chat.demoteParticipants([number + '@c.us']);
        msg.reply(`${number} is no longer an admin`);
      }    
    } else if (msg.body === '/status') {
      await bot_react();
      msg.reply("I'm alive😁💯️");
    } else if (msg.body === '/tagall') {
      await bot_react();
      if (chat.isGroup) {
        let mentions = [];
        for (let participant of chat.participants) {
          mentions.push(participant.id._serialized);
        }
        if (!msg.hasQuotedMsg) {
          chat.sendMessage('@everyone', { mentions });
        } else {
          const quotedMsg = await msg.getQuotedMessage();
          if (quotedMsg.hasMedia) {
            const attachmentData = await quotedMsg.downloadMedia();
            chat.sendMessage(attachmentData, { caption: quotedMsg.body, mentions });
          } else {
            chat.sendMessage(quotedMsg.body, { mentions });
          }
        }
      } else {
        msg.reply('This command can only be used in a group!');
      }
    } else if (msg.body === '/del' || msg.body === '/delete') {
      await bot_react();
      if (msg.hasQuotedMsg) {
        const quotedMsg = await msg.getQuotedMessage();
        quotedMsg.delete(true);
      } else {
        msg.reply('Please tag the message to be deleted');
      }
    } else if (msg.body.startsWith('/pin ')) {
      await bot_react();
      if (msg.hasQuotedMsg) {
        const quotedMsg = await msg.getQuotedMessage();
        let time = await getPinTime(msg.body.split(" ")[1], msg.body.split(" ")[2]);
        if (time) {
          const result = await quotedMsg.pin(time);
          msg.reply(result ? 'Pinned' : "Couldn't Pin Message");
        }
      } else {
        msg.reply('Please tag the message to be pinned');
      }
    } else if(msg.body.startsWith('/removebg')) {
      await bot_react();
      if(!msg.hasQuotedMsg) {await msg.reply('You forgot to tag the image');await bot_unreact();return}
      let quotedMsg = await msg.getQuotedMessage();
      if(!quotedMsg.hasMedia) {await msg.reply('You didnt tag an image');await bot_unreact();return}
      let media = await quotedMsg.downloadMedia();
      if(!media || !media?.data) {await msg.reply('Something went wrong');await bot_unreact();return}
      const output = `${(Math.random()*(10e10)).toFixed()}_media_dl.jpg`;
      const buffer = Buffer.from(media.data, 'base64');
      fs.writeFileSync(output,buffer);
      let outputUrl = await removebg(output);
      let mediaData = await MessageMedia.fromUrl(outputUrl, {filename: `piko_removebg_${Date.now()}`});
      if(!mediaData) {await msg.reply('Something went wrong');await bot_unreact();return}
      await chat.sendMessage(mediaData, {quotedMessageId: msg.id._serialized, sendMediaAsDocument: true});
      fs.unlinkSync(output);
    } else if(msg.body === '/carbon') {
      await bot_react();
        if(!msg.hasQuotedMsg) { msg.reply('You forgot to tag the code to carbonize') }
        let quotedMsg = await msg.getQuotedMessage();
        let carbonOutputPath = await carbonize(quotedMsg.body);
        let carbonOutputMedia = await MessageMedia.fromFilePath(carbonOutputPath);
        await chat.sendMessage(carbonOutputMedia, {quotedMessageId: msg.id._serialized});
    } else if (msg.body.startsWith('/chat ')) {
      await bot_react();
      let a = msg.body.replace("/chat ", "");
      let res = await chatFunction(a);
      if (res) {
        await msg.reply(res + `\n\n> *ⓘ _Generated by Gemini_*`);      
      } else {
        await msg.reply("Sorry, Can't chat right now, I've hit my chat limit... Try later");      
      }
    } else if(msg.body.startsWith('/aniinfo ')) {
      await bot_react();
      let parts = msg.body.split(' ');
      if(parts.length !== 2) {
        await msg.reply(`Correct usage is "/aniinfo [anime-id]", get the "anime-id" by running "/anisearch [Anime name]"`);await bot_unreact();return
      }
      let data = await aniinfo(parts[1]); 
      console.log(data);
      if(!data.success) { await msg.reply('Bot error: ' + data.error || 'Something went wrong...');await bot_unreact();return }
      let media = await MessageMedia.fromUrl(data.coverlink);
      let message_template = `🎬 *Anime Info* 🎬\n\n
📑 Name: ${data.name || 'unknown'}\n
🔑 ID: ${parts[1]}\n\n
📖 Type: ${data.type || 'unknown'}\n
📜 Summary: ${data.description || 'unknown'}\n
📌 Status: ${data.status || 'unknown'}\n
🗓️ Released: ${data.released || 'unknown'}\n
🗓️ Updated: ${data.updated || 'unknown'}\n
🎭 Genre: ${data.genre || 'unknown'}\n
📛 Other name: ${data.other_name || 'unknown'}
      
      ${data.ep_end ? `\n\n⬇️✨ Piko can download up to episode ${data.ep_end} for this anime. Use /anidl ${parts[1]} [episode-number] to download` : ''}`;
      await chat.sendMessage(media, {quotedMessageId: msg.id._serialized, caption: message_template});
    } else if(msg.body.startsWith('/anisearch')) {
      await bot_react();
        if(msg.body.split(' ').length === 1) { await msg.reply('Use this command as:\n\n`/anisearch [anime-name]`');await bot_unreact();return}
        let y = msg.body.split(' ');
        y.shift();
        let name = y.join(' ');
        let result = await anisearch(name);
        if(!result.success) { await msg.reply('Something is wrong with the anime plugin');await bot_unreact();return }
        if(!result.results) { await msg.reply('No results found, try shortening the search string, use Japanese name or checking the spelling');await bot_unreact();return  }
        const formattedReply = 
  `🎌 *Anime Search Results* 🎏
  ────────────────
  ${result.results.slice(0, 5).map((anime, index) => 
    `${index + 1}. ${anime.text}\n   🔖 ID: \`${anime.animeID}\``
  ).join('\n\n')}
  ────────────────
  ${result.results.length === 0 ? 
    "❌ No results found, check the spelling or try the japanese name (use only english alphabets though)" : 
    `📑 Found ${result.results.length} matches\n` + 
    "Currently displaying up to 5 results. Increase the search results by using the command /anisearch [name] [results]\n" +
    "Use the ID with /aniinfo [ID] to get details or /anidl [ID] [episode] to download \n\n`Example: /aniinfo one-piece`"}`;
        msg.reply(formattedReply);
    } else if(msg.body.startsWith('/anidl')) {
      let parts = msg.body.split(' ');
      if(parts.length < 3) {
        msg.reply(`Correct usage is "/anidl [id] [episode-number]", use command /anisearch to Search for an anime and get its ID`);await bot_unreact();return
      }
      let vid = await anidl(parts[1],parts[2]);
      let stats = fs.statSync(vid);
      await chat.sendMessage(MessageMedia.fromFilePath(vid),{ quotedMessageId: msg.id._serialized, sendMediaAsDocument: stats.size > 10*1024*1024 });
    } else if(msg.body === '/sticker') {
      await bot_react();
        if(!msg.hasQuotedMsg) {
          msg.reply('Please tag the image/video to convert to a sticker');await bot_unreact();return
        }
        let quotedMsg = await msg.getQuotedMessage();
        if(!quotedMsg.hasMedia) { msg.reply('Please tag an image/video to convert to a sticker');await bot_unreact();return  }
        let media = await quotedMsg.downloadMedia();
        const output = `${(Math.random()*(10e10)).toFixed()}_sticker.jpg`;
        const buffer = Buffer.from(media.data, 'base64');
        fs.writeFileSync(output,buffer);
        const stickerMedia = MessageMedia.fromFilePath(`${output}`);
        await chat.sendMessage(stickerMedia, { quotedMessageId: msg.id._serialized, sendMediaAsSticker: true });
        fs.unlinkSync(output);
    } else if (msg.body.startsWith('/moviesearch ')) {
      await bot_react();
      let movieName = msg.body.replace('/moviesearch ', '');
      let res = await moviesearch(movieName);
      console.log(res);
      if(!res.success) {
        msg.reply(res.error || 'Something went wrong... i think?');
        return;
      }
      let resultsText = res.result.map((val, index) => 
          `🎬 *${index + 1}. ${val.name}*\n   📌 ID: ${val.id}\n━━━━━━━━━━━━━━━━━━━`
      ).join('\n');
  
      let message_template = 
          `🍿 *Movie Search Results for* "${movieName}" 🎥\n\n` +
          `${resultsText || '❌ No results found'}\n\n` +
          `_🔍 Total results: ${res.length}_`;
  
      msg.reply(message_template);
  } else if (msg.body.startsWith('/ytdl ')) {
      await bot_react();
      try {
        const videoUrl = msg.body.split(' ')[1];
        const result = await ytdl(videoUrl);
  
        if (!result.success) {
          return await msg.reply('Download failed. Please try again later.');
        }
        const files = await fsPromises.readdir('./');
          const path = files.find(file => file.startsWith(result.filePath) && file.includes('.mp4')) || null;
          if(!path) { msg.reply("Couldn't complete download");await bot_unreact();return }
        const ffmpegCmd = `ffmpeg -i ${path} -vf "scale='min(1280,iw)':'-2'" -c:v libx264 -profile:v baseline -level 3.0 -pix_fmt yuv420p -c:a aac -b:a 128k -movflags +faststart output_${path}`;
          let execPromise = util.promisify(exec);
          const { stdout, stderr } = await execPromise(ffmpegCmd);
            let media = MessageMedia.fromFilePath(`output_${path}`);
            await chat.sendMessage(media, {caption: 'Your video is ready!', quotedMessageId: msg.id._serialized});
            fs.unlinkSync(path);
            fs.unlinkSync(`output_${path}`);
          } catch (error) {
        console.error('Error processing video:', error);
        msg.reply('An error occurred while processing your request.');
      }
    } else if (msg.body === '/ban') {
      await bot_react();
      if (msg.hasQuotedMsg) {
        const quotedMsg = await msg.getQuotedMessage();
        chat.removeParticipants([quotedMsg.author]);
        msg.reply('Member +' + quotedMsg.author.replace('@c.us', '') + ' was banned by admin +' + msg.author.replace('@c.us', ''));
      } else {
        msg.reply(`Please tag the person to be banned or use /ban [The person's number]`);
      }
    } else if (msg.body.startsWith('/ban ')) {
      await bot_react();
      let t = `Banned user @${msg.body.split(" ")[1]}\n`;
      if (msg.body.split(" ")[2]) {
        t += "Reason: " + msg.body.replace("/ban " + msg.body.split(" ")[1], "");
      }
      msg.reply(t);
      chat.removeParticipants([msg.body.split(" ")[1].replace('+', '') + '@c.us']);
    } else if (msg.body === "/link") {
      await bot_react();
      let l = await chat.getInviteCode();
      msg.reply('https://chat.whatsapp.com/' + l);
    } else if(msg.body === '/restart Emmanuel') {
      startCountdown(true).catch(console.error);
    } else if (msg.hasQuotedMsg) {
      const quotedMsg = await msg.getQuotedMessage();
      if (quotedMsg.body.includes('> *ⓘ _Generated by Gemini_*') && quotedMsg.fromMe) {
        let quotedMessagesArray = [];
        await getMemory(msg, quotedMessagesArray);
        quotedMessagesArray.reverse();
        temp_bool = false;
        let res = await chatFunction(msg.body, quotedMessagesArray);
        if (res) {
          await msg.reply(res + `\n\n> *ⓘ _Generated by Gemini_*`);      
        } else {
          await msg.reply("Sorry, Can't chat right now, I've hit my chat limit... Try later");      
        }
      }
    }
  } catch(e) {
    console.error('An error occured', e);
  } finally {
    await bot_unreact();
    await setState('none', chat)
  }
});
  
  async function getPinTime(num, type) {
    const timeMap = { seconds: 1, minutes: 60, hours: 3600, days: 86400 };
    return timeMap[type.toLowerCase()] ? num * timeMap[type.toLowerCase()] : null;
  }
  
  async function setState(state, chat) {
    if (state === 'typing') {
      chat.sendStateTyping();
    } else if (state === 'none') {
      chat.clearState();
    }
  }
  
  let temp_bool = false;
  async function getMemory(msg, quotedMessagesArray) {
    const quotedMsg = await msg.getQuotedMessage();
    if (quotedMsg) {
      const role = temp_bool ? "user" : "assistant";
      quotedMessagesArray.push({
        role: role,
        content: quotedMsg.body.trim().split("'").join('').split('> *ⓘ _Generated by Gemini_*').join('').trim()
      });
      temp_bool = !temp_bool;
      if (quotedMsg.hasQuotedMsg) {
        await getMemory(quotedMsg, quotedMessagesArray);
      }
    }
  }
  
  async function convertImageToSticker(imagePath) {
    // Convert image to a 512x512 WebP sticker
    const buffer = await sharp(imagePath)
      .resize(512, 512, { fit: 'inside' })
      .toFormat('webp')
      .toBuffer();
    return buffer.toString('base64');
  }

startCountdown().catch(console.error);
