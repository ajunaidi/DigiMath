/**
 * DigiMath — Integrated Voice Input Component
 * Handles inline microphone buttons inside textareas
 */
const VoiceInput = (() => {
  let recognition = null;
  let isListening = false;
  let targetElement = null;
  let activeMicBtn = null;

  function init() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;

    recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      isListening = true;
      if (activeMicBtn) {
        activeMicBtn.classList.add('listening');
        activeMicBtn.innerHTML = '<i class="fa-solid fa-stop"></i>';
      }
      showVoiceToast('🎤 Listening... Speak now');
    };

    recognition.onend = () => {
      isListening = false;
      if (activeMicBtn) {
        activeMicBtn.classList.remove('listening');
        activeMicBtn.innerHTML = '<i class="fa-solid fa-microphone"></i>';
      }
      activeMicBtn = null;
      targetElement = null;
    };

    recognition.onerror = (e) => {
      isListening = false;
      if (activeMicBtn) {
        activeMicBtn.classList.remove('listening');
        activeMicBtn.innerHTML = '<i class="fa-solid fa-microphone"></i>';
      }
      if (e.error === 'not-allowed') showVoiceToast('⚠️ Microphone access denied');
    };

    recognition.onresult = (event) => {
      let finalT = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
            let transcript = event.results[i][0].transcript;
            // MATH CONVERSION LOGIC (Local)
            transcript = transcript.toLowerCase()
              .replace(/\bintegral\b/g, '\\int')
              .replace(/\bsum\b/g, '\\sum')
              .replace(/\balpha\b/g, '\\alpha')
              .replace(/\bbeta\b/g, '\\beta')
              .replace(/\bgamma\b/g, '\\gamma')
              .replace(/\btheta\b/g, '\\theta')
              .replace(/\bpi\b/g, '\\pi')
              .replace(/\bsquare root of\b/g, '\\sqrt{')
              .replace(/\bsquare root\b/g, '\\sqrt{')
              .replace(/\binfinity\b/g, '\\infty')
              .replace(/\bdivided by\b/g, '/')
              .replace(/\btimes\b/g, '*')
              .replace(/\bplus\b/g, '+')
              .replace(/\bminus\b/g, '-')
              .replace(/\bequals\b/g, '=');
            
            finalT += transcript;
        }
      }
      if (finalT && targetElement) {
        // Add space if there is already text
        targetElement.value += (targetElement.value && !targetElement.value.endsWith(' ') ? ' ' : '') + finalT;
        // Trigger input event to update any listeners
        targetElement.dispatchEvent(new Event('input', { bubbles: true }));
        showVoiceToast('✅ Added: "' + finalT.substring(0, 40) + '..."');
      }
    };
  }

  function toggleInline(btnElement, targetInputId) {
    if (!recognition) {
      showVoiceToast('⚠️ Speech recognition not supported in this browser.');
      return;
    }
    
    // If we are currently listening on THIS button, stop it
    if (isListening && activeMicBtn === btnElement) {
      recognition.stop();
      return;
    }
    
    // If listening on another button, stop it first
    if (isListening) {
      recognition.stop();
      // wait a bit before starting new one
      setTimeout(() => startListening(btnElement, targetInputId), 300);
      return;
    }

    startListening(btnElement, targetInputId);
  }

  function startListening(btnElement, targetInputId) {
    targetElement = document.getElementById(targetInputId);
    if (!targetElement) return;
    
    activeMicBtn = btnElement;
    targetElement.focus();
    
    try {
      recognition.start();
    } catch (e) {
      console.error(e);
    }
  }

  function showVoiceToast(msg) {
    const existing = document.getElementById('toast');
    if (existing && typeof showToast === 'function') { showToast(msg); return; }
    let toast = document.getElementById('voiceToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'voiceToast';
      toast.style.cssText = `
        position:fixed; bottom:30px; left:50%; transform:translateX(-50%); z-index:9999;
        padding:10px 24px; border-radius:8px; background:#1e293b;
        color:white; font-size:14px; font-family:Inter,sans-serif;
        box-shadow:0 4px 12px rgba(0,0,0,0.15); transition:opacity 0.3s; opacity:0; pointer-events:none;
      `;
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.style.opacity = '1';
    setTimeout(() => { toast.style.opacity = '0'; }, 3000);
  }

  // Auto-init on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return { toggleInline, isListening: () => isListening };
})();
