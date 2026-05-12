/**
 * DigiMath — Google Gemini AI Configuration
 * Free Tier: ~15 requests/minute, 1500 requests/day
 * Model: gemini-2.0-flash (auto-retry on rate limit)
 */

const GEMINI_API_KEY = 'AIzaSyDrCQjuDurxtXnzpKMnRjcOzR-31K9VNi0';
const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_BASE_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

/**
 * Call Gemini with auto-retry on rate limit (429 errors)
 */
async function _geminiCall(body, retries = 2) {
  const res = await fetch(GEMINI_BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (res.status === 429 && retries > 0) {
    // Rate limited — wait and retry
    const waitSec = Math.min(40, 20 + (3 - retries) * 15);
    const toastEl = document.getElementById('toast');
    if (toastEl) {
      toastEl.textContent = `⏳ Rate limit — waiting ${waitSec}s then retrying...`;
      toastEl.classList.add('show');
    }
    await new Promise(r => setTimeout(r, waitSec * 1000));
    if (toastEl) toastEl.classList.remove('show');
    return _geminiCall(body, retries - 1);
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Gemini API error (${res.status})`);
  }
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
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
