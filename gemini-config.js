/**
 * DigiMath — Multi-Model AI Configuration
 * Using Puter.js for Unlimited Access to Gemini, Claude, DeepSeek, Amazon Nova & more.
 */

const GEMINI_API_KEY = window.DIGIMATH_CONFIG?.GEMINI_API_KEY || '';

/**
 * Global UI status helper
 */
function showStatus(msg) {
  const toastEl = document.getElementById('toast');
  if (toastEl) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    setTimeout(() => toastEl.classList.remove('show'), 3000);
  } else {
    console.log('Status:', msg);
  }
}

/**
 * Main AI Call function
 */
async function _aiCall(body, options = {}) {
  const { model = 'gemini-2.0-flash', useDirect = false } = options;

  if (window.puter && window.puter.ai && !useDirect) {
    try {
      showStatus(`✨ Using Puter (${model})...`);
      const prompt = body.contents[0].parts.find(p => p.text)?.text || '';
      const imagePart = body.contents[0].parts.find(p => p.inline_data);
      
      let response;
      if (imagePart) {
        const imageData = `data:${imagePart.inline_data.mime_type};base64,${imagePart.inline_data.data}`;
        response = await puter.ai.chat(prompt, imageData, { model: model });
      } else {
        response = await puter.ai.chat(prompt, { model: model });
      }
      
      if (typeof response === 'object' && response.message && response.message.content) {
          return response.message.content[0].text;
      }
      return typeof response === 'string' ? response : response.toString();
    } catch (err) {
      console.warn('Puter.ai failed, falling back:', err);
    }
  }

  // Fallback to Direct Google API
  if (model.includes('gemini') && GEMINI_API_KEY) {
    showStatus('🔄 Switching to Direct API (Backup)...');
    const directModel = 'gemini-1.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${directModel}:generateContent?key=${GEMINI_API_KEY}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }
  throw new Error('AI Provider unavailable.');
}

/**
 * Puter Specific APIs (Summarization & Sentiment)
 */
async function aiSummarize(text) {
  if (!window.puter) throw new Error('Puter.js not loaded');
  showStatus('📄 Summarizing document...');
  const response = await puter.ai.summarize(text);
  return response;
}

async function aiAnalyzeSentiment(text) {
  if (!window.puter) throw new Error('Puter.js not loaded');
  showStatus('🔍 Analyzing sentiment...');
  const response = await puter.ai.analyzeSentiment(text);
  return response;
}

/**
 * Model Specific Wrappers
 */
const AI = {
  gemini: (prompt) => _aiCall({ contents: [{ parts: [{ text: prompt }] }] }, { model: 'gemini-2.0-flash' }),
  vision: (base64, mime, prompt) => _aiCall({ contents: [{ parts: [{ inline_data: { mime_type: mime, data: base64 } }, { text: prompt }] }] }, { model: 'gemini-2.0-flash' }),
  claude: (prompt) => _aiCall({ contents: [{ parts: [{ text: prompt }] }] }, { model: 'claude-opus-4-7' }),
  deepseek: (prompt) => _aiCall({ contents: [{ parts: [{ text: prompt }] }] }, { model: 'deepseek-v3' }),
  nova: (prompt) => _aiCall({ contents: [{ parts: [{ text: prompt }] }] }, { model: 'amazon-nova-pro-v1' }),
  summarize: aiSummarize,
  sentiment: aiAnalyzeSentiment
};

window.GeminiAI = AI; // Keep legacy name for compatibility
window.DigiMathAI = AI;
