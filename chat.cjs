const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({ apiKey: "AIzaSyD7vvsJW9CYE1jGbKXeMS-Jbbc6_hJgSBA" });

const systemInstruction = "You are Piko, A Whatsapp chatbot. No need to be formal. Be brief and concise, limit responses to about 40 words if possible. All responses should be formatted to Whatsapp's text-formatting Standards";

async function chat(prompt, quotedMessagesArray) {
  let t = [];
  if(!quotedMessagesArray) {
    t = [
      {
        role: "user",
        content: prompt,
      },
    ]
  } else {
     t = [...quotedMessagesArray];
     t.push({role: "user", content: prompt});
  }
  const b = await countCharacters(t);
  if(b > 250) {
    return "😵‍💫_*Insufficient Memory*_, Start a new chat with the /chat command"
  };
  try {
  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: JSON.stringify(t),
    config: {
      systemInstruction: systemInstruction,
    },
  });
  return response.text;
  } catch (error) {
    console.error("Error in chat function:", error);
    return "Sorry, there was an error trying to connect to the AI Service";
  }
}

async function countCharacters(arr) {
    return arr.reduce((total, str) => total + str.length, 0);
}

module.exports = chat