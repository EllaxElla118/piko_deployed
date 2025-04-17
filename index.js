import pkg from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import mongoose from 'mongoose';
import { MongoStore } from 'wwebjs-mongo';
import puppeteer from 'puppeteer';
import dotenv from 'dotenv';
import { startCountdown } from './newaction.js';

const { Client, RemoteAuth } = pkg;

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
client.on('qr', qr => {
  console.log('📲 Scan this QR code:', qr);
  qrcode.generate(qr, { small: true });
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

startCountdown().catch(console.error);
