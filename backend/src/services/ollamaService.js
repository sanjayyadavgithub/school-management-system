const axios = require('axios');

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3';

/**
 * Sends a prompt to local Ollama API
 * @param {string} prompt - Prompt instruction
 * @param {object} systemContext - Optional system instructions
 */
const generateResponse = async (prompt, systemContext = '') => {
  try {
    const response = await axios.post(`${OLLAMA_URL}/api/generate`, {
      model: OLLAMA_MODEL,
      prompt: systemContext ? `${systemContext}\n\nUser: ${prompt}` : prompt,
      stream: false,
    }, { timeout: 30000 }); // 30s timeout

    return response.data.response;
  } catch (error) {
    console.error('Ollama connection failed:', error.message);
    
    // Provide a helpful developer fallback response if Ollama is not running locally
    return `[Local Ollama Sandbox Fallback]
Reason: Could not connect to local Ollama at ${OLLAMA_URL}.
Verify Ollama is installed and running ('ollama serve') and model '${OLLAMA_MODEL}' is pulled.

Generated Draft Example:
- Title: School Update
- Details: System generated placeholder due to Ollama server connection check. Please verify local environment.`;
  }
};

/**
 * Sends messages history for chat conversations
 * @param {Array} messages - [{ role: 'user', content: '...' }]
 */
const generateChat = async (messages) => {
  try {
    const response = await axios.post(`${OLLAMA_URL}/api/chat`, {
      model: OLLAMA_MODEL,
      messages: messages,
      stream: false,
    }, { timeout: 30000 });

    return response.data.message.content;
  } catch (error) {
    console.error('Ollama chat connection failed:', error.message);
    return `[Ollama Error] Local Ollama service is unavailable. Please run 'ollama run ${OLLAMA_MODEL}' to start the assistant.`;
  }
};

module.exports = {
  generateResponse,
  generateChat,
};
