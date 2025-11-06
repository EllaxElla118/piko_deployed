const { faker } = require('@faker-js/faker');

let currentWord = null;
let gameActive = false;

// Start a new round
async function startGame(message, store) {
  if (gameActive) return message.reply("⚠️ A round is already in progress!");

  gameActive = true;
  currentWord = faker.word.sample();

  await message.reply(`⚡ FASTEST FINGER ⚡\nType this word exactly:\n\n👉 *${currentWord}*`);
}

// Handle incoming message (to be wired in index.js)
async function handleMessage(message, store) {
  if (!gameActive || !currentWord) return;

  const text = message.body.trim();

  if (text === currentWord) {
    gameActive = false;

    const userId = message.author || message.from;
    const displayName = message._data?.notifyName || userId.split('@')[0];

    // Update score
    const currentScore = (await store.get(userId)) || 0;
    await store.set(userId, currentScore + 1);

    await message.reply(`🎉 *${displayName}* was the fastest!\nWord: ${currentWord}\nScore: ${currentScore + 1}`);

    // Show leaderboard
    const allScores = await store.getAll();
    const leaderboard = Object.entries(allScores)
      .sort((a, b) => b[1] - a[1])
      .map(([id, sc], i) => `${i + 1}. ${id.split('@')[0]} — ${sc}`)
      .join('\n');

    const chat = await message.getChat();
    await chat.sendMessage(`🏆 Leaderboard:\n${leaderboard}`);

    currentWord = null;
  }
}

module.exports = {
  startGame,
  handleMessage
};
