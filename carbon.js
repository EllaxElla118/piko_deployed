import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

export default async function carbon(code) {
  // 1. Normalize indentation
  const normalized = code
    .split('\n')
    .map(line => line.trimStart())
    .join('\n');

  // 2. Send to Carbonara API
  const res = await fetch('https://carbonara.solopov.dev/api/cook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code: normalized,
      backgroundColor: '#FFFFFF',
      theme: '3024-night',
    }),
  });

  if (!res.ok) {
    throw new Error(`⚠️ Failed to generate image: ${res.status} ${res.statusText}`);
  }

  // 3. Write response buffer to a file
  const buffer   = await res.buffer();
  const filename = `${Date.now()}_carbon_output.jpg`;
  const filePath = path.join(__dirname, filename);

  await fs.writeFile(filePath, buffer);
  return filePath;
}