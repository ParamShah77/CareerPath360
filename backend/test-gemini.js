const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function testChat() {
  try {
    console.log('🧪 Testing gemini-2.5-flash...\n');
    
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent('Say hello and tell me you are working!');
    const response = result.response.text();
    
    console.log('✅ SUCCESS! Model works!\n');
    console.log('Response:', response);
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

testChat();
