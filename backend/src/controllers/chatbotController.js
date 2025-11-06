const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// System instructions for the AI
const SYSTEM_PROMPT = `You are CareerPath360.AI Assistant, a helpful career guidance and resume expert.

Your Role:
- Help users improve their resumes and career prospects
- Provide specific, actionable advice
- Guide users through the CareerPath360 platform
- Answer questions about job search and skill development

Platform Features:
1. Resume Upload & ATS Scoring - Upload PDF/DOCX for instant analysis
2. Skill Gap Analysis - Compare skills with target job roles
3. Course Recommendations - 54+ courses for skill development
4. Resume Builder - Create professional resumes from scratch
5. Analysis History - Track progress over time

Guidelines:
- Be friendly, encouraging, and professional
- Keep responses concise (2-3 paragraphs)
- Give specific examples when possible
- If asked about platform features, explain how to use them
- For skill questions, recommend relevant courses

Example Topics:
✓ "How do I improve my ATS score?"
✓ "What skills should I learn for [job role]?"
✓ "How do I write a strong professional summary?"
✓ "Which courses are best for web development?"
✓ "How do I use the resume builder?"

Remember: Be helpful, specific, and encourage continuous learning!`;

// @desc    Send message to AI chatbot
// @route   POST /api/chatbot/message
// @access  Private
exports.sendMessage = async (req, res) => {
  try {
    const { message, conversationHistory = [] } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        status: 'error',
        message: 'Message is required'
      });
    }

    console.log('💬 Chat request from user:', req.user.id);
    console.log('📝 Message:', message.substring(0, 50) + '...');

    // Use gemini-2.5-flash - the latest fast model available for this API key
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash"
    });

    // Build context from conversation history
    let contextMessage = SYSTEM_PROMPT + '\n\n';
    
    // Add recent conversation history (last 5 messages for context)
    const recentHistory = conversationHistory
      .filter(msg => msg.content !== 'Hi! 👋 I\'m your CareerPath360 AI Assistant. How can I help you today?')
      .slice(-5);
    
    if (recentHistory.length > 0) {
      contextMessage += 'Recent conversation:\n';
      recentHistory.forEach(msg => {
        contextMessage += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n`;
      });
      contextMessage += '\n';
    }
    
    contextMessage += `User: ${message}\nAssistant:`;

    // Generate response directly without chat session
    const result = await model.generateContent(contextMessage);
    const response = result.response.text();

    console.log('✅ AI response generated');

    res.status(200).json({
      status: 'success',
      data: {
        message: response,
        timestamp: new Date()
      }
    });

  } catch (error) {
    console.error('❌ Chatbot error:', error);
    
    // Handle specific Gemini errors
    if (error.message?.includes('API key')) {
      return res.status(500).json({
        status: 'error',
        message: 'AI service configuration error. Please contact support.'
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Sorry, I encountered an error. Please try again.',
      error: error.message
    });
  }
};

// @desc    Get suggested questions
// @route   GET /api/chatbot/suggestions
// @access  Public
exports.getSuggestions = async (req, res) => {
  try {
    const suggestions = [
      "How can I improve my ATS score?",
      "What skills are most in-demand for software engineers?",
      "How do I write an effective professional summary?",
      "What courses should I take to learn web development?",
      "How do I optimize my resume for tech jobs?",
      "What's the difference between hard and soft skills?",
      "How do I highlight my achievements effectively?",
      "What should I include in my resume for a data science role?"
    ];

    res.status(200).json({
      status: 'success',
      data: { suggestions }
    });

  } catch (error) {
    console.error('Get suggestions error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching suggestions'
    });
  }
};

module.exports = exports;
