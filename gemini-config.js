/**
 * DigiMath — Stable AI Configuration (Puter-First)
 */

// Load settings from localStorage or fallback to config.js
const getSettings = () => {
    const saved = localStorage.getItem('digimath_settings');
    return saved ? JSON.parse(saved) : {
        geminiKey: window.DIGIMATH_CONFIG?.GEMINI_API_KEY || '',
        provider: 'puter', // 'puter' or 'direct'
        model: 'gemini-1.5-flash'
    };
};

function showStatus(msg) {
    const toastEl = document.getElementById('toast');
    if (toastEl) {
        toastEl.textContent = msg;
        toastEl.classList.add('show');
        setTimeout(() => toastEl.classList.remove('show'), 3000);
    }
}

async function _aiCall(body, options = {}) {
    const settings = getSettings();
    const model = options.model || settings.model;
    const useDirect = settings.provider === 'direct';

    // Try Direct API if preferred
    if (useDirect && settings.geminiKey) {
        try {
            showStatus('🚀 Using Direct Gemini API...');
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${settings.geminiKey}`;
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error.message);
            return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        } catch (err) {
            console.warn('Direct API failed, falling back to Puter:', err);
        }
    }

    // Default to Puter (Stable 4:00 PM state)
    if (window.puter && window.puter.ai) {
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
            if (err.message?.includes('auth')) {
                showStatus('🔑 Please log in to Puter (Popup opened)');
            }
            throw err;
        }
    }
    throw new Error('No AI provider available. Check your Settings.');
}

const AI = {
    gemini: (prompt) => _aiCall({ contents: [{ parts: [{ text: prompt }] }] }),
    vision: (base64, mime, prompt) => _aiCall({ contents: [{ parts: [{ inline_data: { mime_type: mime, data: base64 } }, { text: prompt }] }] }),
    summarize: async (text) => window.puter ? puter.ai.summarize(text) : AI.gemini(`Summarize: ${text}`),
};

window.GeminiAI = AI;
window.DigiMathAI = AI;
window.DigiMathSettings = {
    get: getSettings,
    save: (data) => localStorage.setItem('digimath_settings', JSON.stringify(data))
};
