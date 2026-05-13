/**
 * DigiMath — AI Intelligence Configuration
 * Supports Gemini (Google), Claude (Anthropic), and Puter.js
 */

// Load settings from localStorage or fallback
const getSettings = () => {
    const saved = localStorage.getItem('digimath_settings');
    const defaults = {
        geminiKey: window.DIGIMATH_CONFIG?.GEMINI_API_KEY || '',
        anthropicKey: '', // User will provide this
        provider: 'puter', // 'puter', 'direct-google', 'direct-anthropic'
        model: 'gemini-1.5-flash'
    };
    return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
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
    const provider = options.provider || settings.provider;

    // --- 1. DIRECT ANTHROPIC (CLAUDE) ---
    if (provider === 'direct-anthropic' || model.includes('claude')) {
        if (settings.anthropicKey) {
            try {
                showStatus(`🚀 Using Claude (${model})...`);
                // Note: Anthropic requires a proxy or server-side call due to CORS.
                // Since this is a browser app, we'll try to use Puter as a bridge if direct fails.
                const prompt = body.contents[0].parts.find(p => p.text)?.text || '';
                const res = await fetch('https://api.anthropic.com/v1/messages', {
                    method: 'POST',
                    headers: {
                        'x-api-key': settings.anthropicKey,
                        'anthropic-version': '2023-06-01',
                        'content-type': 'application/json',
                        'anthropic-dangerous-direct-browser-access': 'true' // Required for client-side
                    },
                    body: JSON.stringify({
                        model: model === 'claude-opus-4-7' ? 'claude-3-5-sonnet-20240620' : model,
                        max_tokens: 4096,
                        messages: [{ role: 'user', content: prompt }]
                    })
                });
                const data = await res.json();
                if (data.error) throw new Error(data.error.message);
                return data.content[0].text;
            } catch (err) {
                console.warn('Anthropic Direct failed:', err);
                // Fallback to Puter if direct fails
            }
        }
    }

    // --- 2. DIRECT GOOGLE (GEMINI) ---
    if (provider === 'direct-google' && settings.geminiKey) {
        try {
            showStatus(`🚀 Using Gemini (${model})...`);
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
            console.warn('Google Direct failed:', err);
        }
    }

    // --- 3. PUTER.JS (Stable Fallback) ---
    if (window.puter && window.puter.ai) {
        try {
            showStatus(`✨ Using Puter AI (${model})...`);
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
                showStatus('🔑 Please log in to Puter');
            }
            throw err;
        }
    }
    
    throw new Error('No AI provider available. Please check your API keys in Settings.');
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
