/**
 * DigiMath — AI Intelligence Configuration
 * Supports Anthropic (Claude) and OpenCode Zen (Multi-model)
 */

// Load settings from localStorage or fallback
const getSettings = () => {
    const saved = localStorage.getItem('digimath_settings');
    const localKeys = window.DIGIMATH_KEYS || {};
    const defaults = {
        anthropicKey: '', 
        opencodeKey: '', 
        provider: 'local', 
        model: 'local'
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
    const provider = settings.provider;

    // --- 1. OPENCODE ZEN (PRIMARY) ---
    if (provider === 'opencode' && settings.opencodeKey) {
        try {
            showStatus(`🚀 Using OpenCode Zen (${model})...`);
            const prompt = body.contents[0].parts.find(p => p.text)?.text || '';
            
            const res = await fetch('https://opencode.ai/zen/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${settings.opencodeKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: model.startsWith('opencode/') ? model : `opencode/${model}`,
                    messages: [{ role: 'user', content: prompt }]
                })
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error?.message || 'OpenCode Zen API Error');
            }

            const data = await res.json();
            return data.choices[0].message.content;
        } catch (err) {
            console.error('OpenCode Zen failed:', err);
            throw err;
        }
    }

    // --- 2. DIRECT ANTHROPIC (BACKUP) ---
    if (provider === 'anthropic' && settings.anthropicKey) {
        try {
            showStatus(`🚀 Using Direct Claude (${model})...`);
            const prompt = body.contents[0].parts.find(p => p.text)?.text || '';
            
            const res = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'x-api-key': settings.anthropicKey,
                    'anthropic-version': '2023-06-01',
                    'content-type': 'application/json',
                    'anthropic-dangerous-direct-browser-access': 'true' 
                },
                body: JSON.stringify({
                    model: model.replace('opencode/', ''),
                    max_tokens: 4096,
                    messages: [{ role: 'user', content: prompt }]
                })
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error?.message || 'Anthropic API Error');
            }

            const data = await res.json();
            return data.content[0].text;
        } catch (err) {
            console.error('Claude Direct failed:', err);
            throw err;
        }
    }
    // --- 3. LOCAL ENGINE (FREE & SMART) ---
    if (provider === 'local') {
        const prompt = body.contents[0].parts.find(p => p.text)?.text || '';
        
        // Check Knowledge Directory first
        const localMatch = window.MathDirectory ? window.MathDirectory.find(prompt) : null;
        if (localMatch) {
            showStatus('✨ Local Intelligence match found...');
            return localMatch;
        }

        // Try symbolic solving with Math.js
        try {
            showStatus('🧬 Computing with Local Math.js...');
            // Simple cleaning of prompt to extract equation
            const expr = prompt.replace(/solve|simplify|evaluate|convert/gi, '').replace(/this/gi, '').trim();
            const result = await window.MathAPIs.solveLocal('simplify', expr);
            return `### Local Analysis Result\n\n**Expression:** $${expr}$$\n**Result:** $${result.result}$$\n\n*Note: Using Local Symbolic Engine. For deep PhD-level reasoning, add an API key in Settings.*`;
        } catch (e) {
            return `### Intelligence Insight\n\nI am currently in **Local Mode**. I can solve symbolic math (like derivatives or simplification) and identify standard theorems.\n\n**To solve this specific complex problem:**\n1. Try simplifying the expression.\n2. Ensure it's in standard math notation (e.g., x^2 + 2x + 1).\n3. Or, add a free API key in Settings for cloud-level reasoning.`;
        }
    }
    
    throw new Error('Please select an Intelligence Mode in Settings.');
}

const AI = {
    gemini: (prompt) => _aiCall({ contents: [{ parts: [{ text: prompt }] }] }),
    vision: (base64, mime, prompt) => _aiCall({ contents: [{ parts: [{ inline_data: { mime_type: mime, data: base64 } }, { text: prompt }] }] }),
    summarize: async (text) => AI.gemini(`Summarize the following academic text: ${text}`),
};

window.DigiMathAI = AI;
window.DigiMathSettings = {
    get: getSettings,
    save: (data) => localStorage.setItem('digimath_settings', JSON.stringify(data))
};
