const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize with API key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const systemInstruction = "You are Piko, A Whatsapp chatbot. No need to be formal. Be brief and concise, limit responses to about 40 words if possible. All responses should be formatted to Whatsapp's text-formatting Standards";

async function chat(prompt, quotedMessagesArray) {
  // Build message history
  let messages = [];
  
  if (!quotedMessagesArray || quotedMessagesArray.length === 0) {
    messages = [
      {
        role: "user",
        parts: [{ text: prompt }],
      },
    ];
  } else {
    // Convert quoted messages to proper format
    messages = quotedMessagesArray.map(msg => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.content }],
    }));
    
    // Add current prompt
    messages.push({
      role: "user",
      parts: [{ text: prompt }],
    });
  }

  // Check message size
  const totalChars = messages.reduce((total, msg) => {
    return total + msg.parts[0].text.length;
  }, 0);

  if (totalChars > 30000) { // More reasonable limit
    return "😵‍💫 *Insufficient Memory*, Start a new chat with the /chat command";
  }

  try {
    // Get the model
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash-exp",
      systemInstruction: systemInstruction,
    });

    // Start chat with history (excluding the last message)
    const chat = model.startChat({
      history: messages.slice(0, -1),
      generationConfig: {
        maxOutputTokens: 200, // Limit response length
        temperature: 0.9,
      },
    });

    // Send the last message
    const result = await chat.sendMessage(messages[messages.length - 1].parts[0].text);
    const response = await result.response;
    const text = response.text();

    return text;

  } catch (error) {
    console.error("Error in chat function:", error);
    
    // Handle specific errors
    if (error.message?.includes('API_KEY_INVALID')) {
      return "⚠️ API key configuration error. Please contact the bot admin.";
    }
    if (error.message?.includes('RATE_LIMIT')) {
      return "⏳ Too many requests. Please try again in a moment.";
    }
    if (error.message?.includes('SAFETY')) {
      return "🚫 Response blocked due to safety filters. Please try a different question.";
    }
    
    return "❌ Sorry, there was an error connecting to the AI service. Please try again.";
  }
}

module.exports = chat;