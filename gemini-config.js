/**
 * DigiMath — Google Gemini AI Configuration
 * Free Tier: 1500 requests/day, 15 requests/minute
 * Model: gemini-1.5-flash (fastest, best for math)
 */

const GEMINI_API_KEY = 'AIzaSyDrCQjuDurxtXnzpKMnRjcOzR-31K9VNi0';
const GEMINI_MODEL = 'gemini-1.5-flash';
const GEMINI_BASE_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

/**
 * Call Gemini API with text prompt
 */
async function geminiText(prompt) {
  const res = await fetch(GEMINI_BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 4096 }
    })
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || 'Gemini API error');
  }
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

/**
 * Call Gemini API with image (base64) + text prompt
 */
async function geminiVision(base64Image, mimeType, prompt) {
  const res = await fetch(GEMINI_BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          { inline_data: { mime_type: mimeType, data: base64Image } },
          { text: prompt }
        ]
      }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 4096 }
    })
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || 'Gemini Vision error');
  }
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

window.GeminiAI = { text: geminiText, vision: geminiVision };
