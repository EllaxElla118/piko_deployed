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

const { Client, RemoteAuth, MessageMedia, LocalAuth } = pkg;

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
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu'
    ],
  },
  webVersionCache: {
    type: 'remote',
    remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html',
  }
});

// Event listeners
client.on('qr', async qr => {
  console.dir(qr);
  // Pairing code feature - uncomment if needed
  // let t = await client.requestPairingCode('2348128850525');
  // console.log('Pairing code:', t);
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

client.on('ready', () => {
  console.log('✅ Client is ready!');
  isReady = true;
});

// Command handler for message_create (outgoing messages)
client.on('message_create', async message => {
  if(message.body === '/ping') {
    message.reply('pong')
  }
});

// Main message handler
client.on('message', async msg => {
  let chat;
  let botReacted = false;
  
  async function bot_unreact() {
    if (botReacted) {
      try {
        await msg.react('');
      } catch (e) {
        console.error('Error removing reaction:', e.message);
      }
    }
  }
  
  async function bot_react() {
    try {
      await chat.sendStateTyping();
      await msg.react('⏳');
      botReacted = true;
    } catch (e) {
      console.error('Error reacting:', e.message);
    }
  }
  
  try {
    chat = await msg.getChat();
    
    if (msg.body.startsWith('/join ')) {
      await bot_react();
      const inviteCode = msg.body.split(' ')[1].replace("https://chat.whatsapp.com/", "");
      try {
        await client.acceptInvite(inviteCode);
        msg.reply('✅ Joined the group!');
      } catch (e) {
        msg.reply("❌ Couldn't join the group. Check the invite link and try again...");
      }
    } else if (msg.body === '/exit') {
      await bot_react();
      if (chat.isGroup) {
        await msg.reply("Bye 👋👋😘");
        await chat.leave();
      } else {
        msg.reply('❌ This command can only be used in a group!');
      }
    } else if (msg.body === '/admins') {
      await bot_react();
      if (chat.isGroup) {
        const admins = chat.participants.filter(participant => participant.isAdmin || participant.isSuperAdmin); 
        const adminList = admins.map(admin => `- +${admin.id.user}`).join('\n');
        await msg.reply(`👑 *Group Admins:*\n${adminList}`);
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
        await chat.sendMessage('@admins', { mentions });
      }
    } else if (msg.body.startsWith('/promote ')) {
      await bot_react();
      if (chat.isGroup) {
        const number = msg.body.split(" ")[1].replace('+', '');
        try {
          await chat.promoteParticipants([number + '@c.us']);
          msg.reply(`✅ ${number} is now an admin`);
        } catch (e) {
          msg.reply(`❌ Failed to promote user: ${e.message}`);
        }
      }
    } else if (msg.body.startsWith('/demote ')) {
      await bot_react();
      if (chat.isGroup) {
        const number = msg.body.split(" ")[1].replace('+', '');
        try {
          await chat.demoteParticipants([number + '@c.us']);
          msg.reply(`✅ ${number} is no longer an admin`);
        } catch (e) {
          msg.reply(`❌ Failed to demote user: ${e.message}`);
        }
      }
    } else if (msg.body === '/status') {
      await bot_react();
      msg.reply("I'm alive 😁💯");
    } else if (msg.body === '/tagall') {
      await bot_react();
      if (chat.isGroup) {
        let mentions = [];
        for (let participant of chat.participants) {
          mentions.push(participant.id._serialized);
        }
        if (!msg.hasQuotedMsg) {
          await chat.sendMessage('@everyone', { mentions });
        } else {
          const quotedMsg = await msg.getQuotedMessage();
          if (quotedMsg.hasMedia) {
            const attachmentData = await quotedMsg.downloadMedia();
            await chat.sendMessage(attachmentData, { caption: quotedMsg.body, mentions });
          } else {
            await chat.sendMessage(quotedMsg.body, { mentions });
          }
        }
      } else {
        msg.reply('❌ This command can only be used in a group!');
      }
    } else if (msg.body === '/del' || msg.body === '/delete') {
      await bot_react();
      if (msg.hasQuotedMsg) {
        const quotedMsg = await msg.getQuotedMessage();
        try {
          await quotedMsg.delete(true);
        } catch (e) {
          msg.reply('❌ Failed to delete message. Make sure the bot has admin privileges.');
        }
      } else {
        msg.reply('❌ Please reply to the message to be deleted');
      }
    } else if (msg.body.startsWith('/pin ')) {
      await bot_react();
      if (msg.hasQuotedMsg) {
        const quotedMsg = await msg.getQuotedMessage();
        let time = await getPinTime(msg.body.split(" ")[1], msg.body.split(" ")[2]);
        if (time) {
          try {
            const result = await quotedMsg.pin(time);
            msg.reply(result ? '📌 Pinned' : "❌ Couldn't pin message");
          } catch (e) {
            msg.reply('❌ Failed to pin message: ' + e.message);
          }
        } else {
          msg.reply('❌ Invalid time format. Use: /pin [number] [seconds/minutes/hours/days]');
        }
      } else {
        msg.reply('❌ Please reply to the message to be pinned');
      }
    } else if(msg.body.startsWith('/removebg')) {
      await bot_react();
      if(!msg.hasQuotedMsg) {
        await msg.reply('❌ Please reply to an image');
        await bot_unreact();
        return;
      }
      let quotedMsg = await msg.getQuotedMessage();
      if(!quotedMsg.hasMedia) {
        await msg.reply('❌ Please reply to an image');
        await bot_unreact();
        return;
      }
      let media = await quotedMsg.downloadMedia();
      if(!media || !media?.data) {
        await msg.reply('❌ Failed to download image');
        await bot_unreact();
        return;
      }
      const output = `${(Math.random()*(10e10)).toFixed()}_media_dl.jpg`;
      const buffer = Buffer.from(media.data, 'base64');
      fs.writeFileSync(output, buffer);
      
      try {
        let outputUrl = await removebg(output);
        let mediaData = await MessageMedia.fromUrl(outputUrl, {filename: `piko_removebg_${Date.now()}`});
        if(!mediaData) {
          await msg.reply('❌ Failed to process image');
          await bot_unreact();
          return;
        }
        await chat.sendMessage(mediaData, {
          quotedMessageId: msg.id._serialized,
          sendMediaAsDocument: true
        });
      } catch (e) {
        await msg.reply('❌ Error removing background: ' + e.message);
      } finally {
        if (fs.existsSync(output)) fs.unlinkSync(output);
      }
    } else if(msg.body === '/carbon') {
      await bot_react();
      if(!msg.hasQuotedMsg) {
        msg.reply('❌ Please reply to a message containing code');
        await bot_unreact();
        return;
      }
      let quotedMsg = await msg.getQuotedMessage();
      try {
        let carbonOutputPath = await carbonize(quotedMsg.body);
        let carbonOutputMedia = await MessageMedia.fromFilePath(carbonOutputPath);
        await chat.sendMessage(carbonOutputMedia, {quotedMessageId: msg.id._serialized});
        if (fs.existsSync(carbonOutputPath)) fs.unlinkSync(carbonOutputPath);
      } catch (e) {
        msg.reply('❌ Failed to create carbon image: ' + e.message);
      }
    } else if (msg.body.startsWith('/chat ')) {
      await bot_react();
      let query = msg.body.replace("/chat ", "");
      try {
        let res = await chatFunction(query);
        if (res) {
          await msg.reply(res + `\n\n> *ⓘ _Generated by Gemini_*`);
        } else {
          await msg.reply("❌ Sorry, can't chat right now. I've hit my chat limit... Try later");
        }
      } catch (e) {
        await msg.reply('❌ Chat error: ' + e.message);
      }
    } else if(msg.body.startsWith('/aniinfo ')) {
      await bot_react();
      let parts = msg.body.split(' ');
      if(parts.length !== 2) {
        await msg.reply(`❌ Correct usage: /aniinfo [anime-id]\nGet the anime-id by running: /anisearch [Anime name]`);
        await bot_unreact();
        return;
      }
      
      try {
        let data = await aniinfo(parts[1]);
        console.log(data);
        
        if(!data.success) {
          await msg.reply('❌ Bot error: ' + (data.error || 'Something went wrong...'));
          await bot_unreact();
          return;
        }
        
        let media = await MessageMedia.fromUrl(data.coverlink);
        let message_template = `🎬 *Anime Info* 🎬

📑 Name: ${data.name || 'unknown'}
🔑 ID: ${parts[1]}

📖 Type: ${data.type || 'unknown'}
📜 Summary: ${data.description || 'unknown'}
📌 Status: ${data.status || 'unknown'}
🗓️ Released: ${data.released || 'unknown'}
🗓️ Updated: ${data.updated || 'unknown'}
🎭 Genre: ${data.genre || 'unknown'}
📛 Other name: ${data.other_name || 'unknown'}${data.ep_end ? `\n\n⬇️✨ Piko can download up to episode ${data.ep_end} for this anime.\nUse: /anidl ${parts[1]} [episode-number]` : ''}`;
        
        await chat.sendMessage(media, {
          quotedMessageId: msg.id._serialized,
          caption: message_template
        });
      } catch (e) {
        await msg.reply('❌ Failed to get anime info: ' + e.message);
      }
    } else if(msg.body.startsWith('/anisearch')) {
      await bot_react();
      if(msg.body.split(' ').length === 1) {
        await msg.reply('❌ Usage: /anisearch [anime-name]');
        await bot_unreact();
        return;
      }
      
      let parts = msg.body.split(' ');
      parts.shift();
      let name = parts.join(' ');
      
      try {
        let result = await anisearch(name);
        
        if(!result.success) {
          await msg.reply('❌ Something is wrong with the anime plugin');
          await bot_unreact();
          return;
        }
        
        if(!result.results || result.results.length === 0) {
          await msg.reply('❌ No results found. Try:\n- Shortening the search string\n- Using the Japanese name\n- Checking the spelling');
          await bot_unreact();
          return;
        }
        
        const formattedReply = `🎌 *Anime Search Results* 🎏
────────────────
${result.results.slice(0, 5).map((anime, index) => 
  `${index + 1}. ${anime.text}\n   🔖 ID: \`${anime.animeID}\``
).join('\n\n')}
────────────────
📑 Found ${result.results.length} matches

💡 Use /aniinfo [ID] for details
💡 Use /anidl [ID] [episode] to download`;
        
        msg.reply(formattedReply);
      } catch (e) {
        await msg.reply('❌ Search failed: ' + e.message);
      }
    } else if(msg.body.startsWith('/anidl')) {
      await bot_react();
      let parts = msg.body.split(' ');
      
      if(parts.length < 3) {
        msg.reply(`❌ Usage: /anidl [id] [episode-number]\nUse /anisearch to find anime ID`);
        await bot_unreact();
        return;
      }
      
      try {
        let vid = await anidl(parts[1], parts[2]);
        let stats = fs.statSync(vid);
        await chat.sendMessage(MessageMedia.fromFilePath(vid), {
          quotedMessageId: msg.id._serialized,
          sendMediaAsDocument: stats.size > 10*1024*1024
        });
        if (fs.existsSync(vid)) fs.unlinkSync(vid);
      } catch (e) {
        await msg.reply('❌ Download failed: ' + e.message);
      }
    } else if(msg.body === '/sticker') {
      await bot_react();
      if(!msg.hasQuotedMsg) {
        msg.reply('❌ Please reply to an image/video to convert to sticker');
        await bot_unreact();
        return;
      }
      
      let quotedMsg = await msg.getQuotedMessage();
      if(!quotedMsg.hasMedia) {
        msg.reply('❌ Please reply to an image/video');
        await bot_unreact();
        return;
      }
      
      try {
        let media = await quotedMsg.downloadMedia();
        const output = `${(Math.random()*(10e10)).toFixed()}_sticker.webp`;
        const buffer = Buffer.from(media.data, 'base64');
        
        // Convert to proper sticker format
        await sharp(buffer)
          .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
          .webp()
          .toFile(output);
        
        const stickerMedia = MessageMedia.fromFilePath(output);
        await chat.sendMessage(stickerMedia, {
          quotedMessageId: msg.id._serialized,
          sendMediaAsSticker: true
        });
        
        if (fs.existsSync(output)) fs.unlinkSync(output);
      } catch (e) {
        await msg.reply('❌ Failed to create sticker: ' + e.message);
      }
    } else if (msg.body.startsWith('/moviesearch ')) {
      await bot_react();
      let movieName = msg.body.replace('/moviesearch ', '');
      
      try {
        let res = await moviesearch(movieName);
        
        if(!res.success) {
          msg.reply('❌ ' + (res.error || 'Something went wrong'));
          return;
        }
        
        let resultsText = res.result.map((val, index) => 
          `🎬 *${index + 1}. ${val.name}*\n   📌 ID: ${val.id}\n━━━━━━━━━━━━━━━━━━━`
        ).join('\n');
        
        let message_template = 
          `🍿 *Movie Search Results for* "${movieName}" 🎥\n\n` +
          `${resultsText || '❌ No results found'}\n\n` +
          `_🔍 Total results: ${res.result.length}_`;
        
        msg.reply(message_template);
      } catch (e) {
        await msg.reply('❌ Search failed: ' + e.message);
      }
    } else if (msg.body.startsWith('/ytdl ')) {
      await bot_react();
      try {
        const videoUrl = msg.body.split(' ')[1];
        const result = await ytdl(videoUrl);
        
        if (!result.success) {
          return await msg.reply('❌ Download failed. Please try again later.');
        }
        
        const files = await fsPromises.readdir('./');
        const path = files.find(file => file.startsWith(result.filePath) && file.includes('.mp4')) || null;
        
        if(!path) {
          msg.reply("❌ Couldn't complete download");
          await bot_unreact();
          return;
        }
        
        const ffmpegCmd = `ffmpeg -i ${path} -vf "scale='min(1280,iw)':'-2'" -c:v libx264 -profile:v baseline -level 3.0 -pix_fmt yuv420p -c:a aac -b:a 128k -movflags +faststart output_${path}`;
        let execPromise = util.promisify(exec);
        const { stdout, stderr } = await execPromise(ffmpegCmd);
        
        let media = MessageMedia.fromFilePath(`output_${path}`);
        await chat.sendMessage(media, {
          caption: '✅ Your video is ready!',
          quotedMessageId: msg.id._serialized
        });
        
        if (fs.existsSync(path)) fs.unlinkSync(path);
        if (fs.existsSync(`output_${path}`)) fs.unlinkSync(`output_${path}`);
      } catch (error) {
        console.error('Error processing video:', error);
        msg.reply('❌ An error occurred while processing your request.');
      }
    } else if (msg.body === '/ban') {
      await bot_react();
      if (msg.hasQuotedMsg) {
        const quotedMsg = await msg.getQuotedMessage();
        try {
          await chat.removeParticipants([quotedMsg.author]);
          msg.reply(`✅ Member +${quotedMsg.author.replace('@c.us', '')} was banned by admin +${msg.author.replace('@c.us', '')}`);
        } catch (e) {
          msg.reply('❌ Failed to ban user. Make sure the bot has admin privileges.');
        }
      } else {
        msg.reply(`❌ Please reply to the person to be banned or use: /ban [number]`);
      }
    } else if (msg.body.startsWith('/ban ')) {
      await bot_react();
      try {
        const number = msg.body.split(" ")[1].replace('+', '');
        let reason = msg.body.replace("/ban " + msg.body.split(" ")[1], "").trim();
        
        await chat.removeParticipants([number + '@c.us']);
        
        let t = `✅ Banned user @${number}`;
        if (reason) {
          t += `\nReason: ${reason}`;
        }
        msg.reply(t);
      } catch (e) {
        msg.reply('❌ Failed to ban user: ' + e.message);
      }
    } else if (msg.body === "/link") {
      await bot_react();
      if (chat.isGroup) {
        try {
          let l = await chat.getInviteCode();
          msg.reply('🔗 Group invite link:\nhttps://chat.whatsapp.com/' + l);
        } catch (e) {
          msg.reply('❌ Failed to get invite link. Make sure the bot has admin privileges.');
        }
      } else {
        msg.reply('❌ This command can only be used in groups!');
      }
    } else if(msg.body === '/restart Emmanuel') {
      await bot_react();
      try {
        await msg.reply('🔄 Restarting bot...');
        await startCountdown(true);
      } catch (e) {
        console.error('Restart error:', e);
      }
    } else if (msg.hasQuotedMsg) {
      const quotedMsg = await msg.getQuotedMessage();
      if (quotedMsg.body.includes('> *ⓘ _Generated by Gemini_*') && quotedMsg.fromMe) {
        await bot_react();
        let quotedMessagesArray = [];
        await getMemory(msg, quotedMessagesArray);
        quotedMessagesArray.reverse();
        temp_bool = false;
        
        try {
          let res = await chatFunction(msg.body, quotedMessagesArray);
          if (res) {
            await msg.reply(res + `\n\n> *ⓘ _Generated by Gemini_*`);
          } else {
            await msg.reply("❌ Sorry, can't chat right now. I've hit my chat limit... Try later");
          }
        } catch (e) {
          await msg.reply('❌ Chat error: ' + e.message);
        }
      }
    }
  } catch(e) {
    console.error('An error occurred:', e);
    try {
      await msg.reply('❌ An error occurred: ' + e.message);
    } catch (replyError) {
      console.error('Failed to send error message:', replyError);
    }
  } finally {
    await bot_unreact();
    try {
      await chat.clearState();
    } catch (e) {
      console.error('Error clearing state:', e.message);
    }
  }
});

async function getPinTime(num, type) {
  const timeMap = { 
    seconds: 1, 
    minutes: 60, 
    hours: 3600, 
    days: 86400 
  };
  const parsedNum = parseInt(num);
  if (isNaN(parsedNum)) return null;
  return timeMap[type.toLowerCase()] ? parsedNum * timeMap[type.toLowerCase()] : null;
}

let temp_bool = false;

async function getMemory(msg, quotedMessagesArray) {
  const quotedMsg = await msg.getQuotedMessage();
  if (quotedMsg) {
    const role = temp_bool ? "user" : "assistant";
    quotedMessagesArray.push({
      role: role,
      content: quotedMsg.body
        .trim()
        .replace(/'/g, '')
        .replace(/> \*ⓘ _Generated by Gemini_\*/g, '')
        .trim()
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
    .resize(512, 512, { 
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .webp()
    .toBuffer();
  return buffer.toString('base64');
}

// Initialize the client
client.initialize();

// Start countdown if the function exists
try {
  await startCountdown();
} catch (e) {
  console.error('Countdown error:', e);
}