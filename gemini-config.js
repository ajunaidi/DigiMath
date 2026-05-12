/**
 * DigiMath — Google Gemini AI Configuration
 * Handles model switching and auto-fallback between 1.5-flash and 2.0-flash
 */

// API Key is loaded from config.js (which is git-ignored for security)
const GEMINI_API_KEY = window.DIGIMATH_CONFIG?.GEMINI_API_KEY || '';

// Current active model (starts with 1.5-flash as it is more stable for free tier quota)
let activeModel = 'gemini-1.5-flash'; 

/**
 * Call Gemini with auto-retry and model fallback
 */
async function _geminiCall(body, retries = 2) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${activeModel}:generateContent?key=${GEMINI_API_KEY}`;
  
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    // Handle Rate Limit (429)
    if (res.status === 429 && retries > 0) {
      const waitSec = 20;
      showStatus(`⏳ Rate limit hit. Waiting ${waitSec}s to retry...`);
      await new Promise(r => setTimeout(r, waitSec * 1000));
      return _geminiCall(body, retries - 1);
    }

    // Handle Quota/Model errors (often 400 or 403)
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const errMsg = errData.error?.message || '';
      
      // If quota exceeded or model not found, try falling back to the other model
      if ((errMsg.includes('quota') || errMsg.includes('not found') || errMsg.includes('not supported')) && activeModel === 'gemini-1.5-flash') {
        showStatus('🔄 Switching to Gemini 2.0 Flash...');
        activeModel = 'gemini-2.0-flash';
        return _geminiCall(body, retries);
      } else if ((errMsg.includes('quota') || errMsg.includes('not found')) && activeModel === 'gemini-2.0-flash') {
        showStatus('🔄 Switching to Gemini 1.5 Flash...');
        activeModel = 'gemini-1.5-flash';
        return _geminiCall(body, retries);
      }

      throw new Error(errMsg || `API Error (${res.status})`);
    }

    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
  } catch (err) {
    if (retries > 0 && err.message.includes('fetch')) {
      await new Promise(r => setTimeout(r, 2000));
      return _geminiCall(body, retries - 1);
    }
    throw err;
  }
}

function showStatus(msg) {
  const toastEl = document.getElementById('toast');
  if (toastEl) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    setTimeout(() => toastEl.classList.remove('show'), 4000);
  }
}

/**
 * Call Gemini API with text prompt
 */
async function geminiText(prompt) {
  return _geminiCall({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.3, maxOutputTokens: 4096 }
  });
}

/**
 * Call Gemini API with image (base64) + text prompt
 */
async function geminiVision(base64Image, mimeType, prompt) {
  return _geminiCall({
    contents: [{
      parts: [
        { inline_data: { mime_type: mimeType, data: base64Image } },
        { text: prompt }
      ]
    }],
    generationConfig: { temperature: 0.1, maxOutputTokens: 4096 }
  });
}

window.GeminiAI = { text: geminiText, vision: geminiVision };
