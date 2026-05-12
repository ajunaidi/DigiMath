/**
 * DigiMath — Global Voice Input Component
 * Adds a floating voice button to any page. When activated it
 * fills whichever textarea/input currently has focus.
 */
const VoiceInput = (() => {
  let recognition = null;
  let isListening = false;
  let targetElement = null;
  let floatingBtn = null;

  function init() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;

    // Create floating mic
    floatingBtn = document.createElement('button');
    floatingBtn.id = 'globalMicBtn';
    floatingBtn.innerHTML = '🎤';
    floatingBtn.title = 'Voice Input (click any input first)';
    floatingBtn.style.cssText = `
      position:fixed; bottom:30px; right:30px; z-index:9998;
      width:56px; height:56px; border-radius:50%; border:none;
      background:linear-gradient(135deg,#7c5cfc,#06d6a0); color:white;
      font-size:24px; cursor:pointer; box-shadow:0 4px 20px rgba(124,92,252,0.4);
      transition:all 0.3s; display:flex; align-items:center; justify-content:center;
    `;
    floatingBtn.addEventListener('click', toggle);
    document.body.appendChild(floatingBtn);

    // Track which input is focused
    document.addEventListener('focusin', (e) => {
      if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') {
        targetElement = e.target;
        floatingBtn.title = 'Voice Input → ' + (e.target.placeholder || e.target.id || 'input');
      }
    });

    recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      isListening = true;
      floatingBtn.style.background = 'linear-gradient(135deg,#ef4444,#f59e0b)';
      floatingBtn.style.animation = 'mic-pulse 1.5s ease infinite';
      floatingBtn.innerHTML = '⏹️';
      showVoiceToast('🎤 Listening... Speak now');
    };
    recognition.onend = () => {
      isListening = false;
      floatingBtn.style.background = 'linear-gradient(135deg,#7c5cfc,#06d6a0)';
      floatingBtn.style.animation = '';
      floatingBtn.innerHTML = '🎤';
    };
    recognition.onerror = (e) => {
      isListening = false;
      floatingBtn.style.background = 'linear-gradient(135deg,#7c5cfc,#06d6a0)';
      floatingBtn.style.animation = '';
      floatingBtn.innerHTML = '🎤';
      if (e.error === 'not-allowed') showVoiceToast('⚠️ Microphone access denied');
    };
    recognition.onresult = (event) => {
      let finalT = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) finalT += event.results[i][0].transcript;
      }
      if (finalT && targetElement) {
        targetElement.value += (targetElement.value ? ' ' : '') + finalT;
        targetElement.dispatchEvent(new Event('input', { bubbles: true }));
        showVoiceToast('✅ Text added: "' + finalT.substring(0, 40) + '..."');
      }
    };
  }

  function toggle() {
    if (!recognition) return;
    if (isListening) {
      recognition.stop();
    } else {
      if (!targetElement) {
        const first = document.querySelector('textarea, input[type="text"]');
        if (first) { targetElement = first; first.focus(); }
      }
      recognition.start();
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
        position:fixed; bottom:100px; right:30px; z-index:9999;
        padding:10px 20px; border-radius:10px; background:rgba(18,18,42,0.95);
        border:1px solid rgba(124,92,252,0.3); color:#eee; font-size:13px;
        font-family:Inter,sans-serif; box-shadow:0 8px 32px rgba(0,0,0,0.4);
        transition:opacity 0.3s; opacity:0;
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

  return { toggle, isListening: () => isListening };
})();
