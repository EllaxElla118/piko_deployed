const words = ["apple", "banana", "cherry", "dragon", "orange", "grape"];
let currentWord = null;
let gameActive = false;
let scores = new Map();
function getRandomWord() {
  return words[Math.floor(Math.random() * words.length)];
}

async function startGame(message) {
  if (gameActive) return message.reply("A round is already in progress!");
  gameActive = true;

  currentWord = getRandomWord();
  await message.reply(`⚡ FASTEST FINGER ⚡\nType this word exactly:\n\n👉 *${currentWord}*`);
}
/*
// Handle messages
client.on("message", async msg => {
  const chat = await msg.getChat();
  const text = msg.body.trim();

  // Start command
  if (text === "!start") return startGame(msg);

  // Ignore if no active game
  if (!gameActive || !currentWord) return;

  // Check response
  if (text === currentWord) {
    gameActive = false;
    const userId = msg.author || msg.from; // Works for groups & DMs

    // Update score
    const prev = scores.get(userId) || 0;
    scores.set(userId, prev + 1);

    await msg.reply(`🎉 *${msg._data.notifyName || userId}* was the fastest!\nWord: ${currentWord}\nScore: ${scores.get(userId)} pts`);

    // Optionally show leaderboard
    let leaderboard = Array.from(scores.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([id, sc], i) => `${i + 1}. ${id.split('@')[0]} — ${sc}`)
      .join('\n');
    await chat.sendMessage(`🏆 Leaderboard:\n${leaderboard}`);
    currentWord = null;
  }
});
*/

module.exports = startGame;