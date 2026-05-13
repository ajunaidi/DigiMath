/**
 * MathVoice — Main Application Logic (with Supabase Auth + DB)
 */

document.addEventListener('DOMContentLoaded', () => {

  // ========================
  //  Init Supabase
  // ========================
  const supaReady = initSupabase();

  // Check for login required redirect
  const params = new URLSearchParams(window.location.search);
  if (params.get('login') === 'required') {
    setTimeout(() => showToast('🔐 Please login to access AI Tools and your data'), 500);
    // Open signup modal automatically
    setTimeout(() => showModal('signupModal'), 1000);
  }

  // ========================
  //  DOM References
  // ========================
  const micBtn = document.getElementById('micBtn');
  const voiceStatus = document.getElementById('voiceStatus');
  const voiceTranscript = document.getElementById('voiceTranscript');
  const waveform = document.getElementById('waveform');
  const latexInput = document.getElementById('latexInput');
  const previewArea = document.getElementById('previewArea');
  const latexCode = document.getElementById('latexCode');
  const heroMath = document.getElementById('heroMath');
  const toastEl = document.getElementById('toast');
  const navToggle = document.getElementById('navToggle');
  const navLinks = document.getElementById('navLinks');

  let currentLatex = '';
  let isListening = false;
  let recognition = null;

  // ========================
  //  Auth State Management
  // ========================
  Auth.init((user, event) => {
    updateAuthUI(user);
  });

  function updateAuthUI(user) {
    const authButtons = document.getElementById('authButtons');
    const userMenu = document.getElementById('userMenu');
    const userNameDisplay = document.getElementById('userNameDisplay');
    const dashboardLink = document.querySelector('a[href="dashboard.html"]');

    if (user) {
      const name = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
      if (authButtons) authButtons.style.display = 'none';
      if (userMenu) userMenu.style.display = 'flex';
      if (userNameDisplay) userNameDisplay.textContent = name;
      
      // Update avatar if it exists (in dashboard)
      const userAvatar = document.getElementById('userAvatar');
      if (userAvatar) userAvatar.textContent = name.charAt(0).toUpperCase();
    } else {
      if (authButtons) authButtons.style.display = 'flex';
      if (userMenu) userMenu.style.display = 'none';
    }
    loadSavedEquations();
  }

  // If supabase not configured, still show app (offline mode)
  if (!supaReady) {
    updateAuthUI(null);
  }

  // ========================
  //  Navigation
  // ========================
  if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => navLinks.classList.toggle('open'));
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => navLinks.classList.remove('open'));
    });
  }
  window.addEventListener('scroll', () => {
    const nav = document.querySelector('.navbar');
    if (nav) nav.classList.toggle('scrolled', window.scrollY > 50);
  });

  // ========================
  //  Hero Demo Math
  // ========================
  try {
    katex.render('\\int_{0}^{\\infty} x^2 \\, dx', heroMath, { displayMode: true, throwOnError: false });
  } catch (e) { heroMath.textContent = '∫₀^∞ x² dx'; }

  // ========================
  //  Tab Switching
  // ========================
  const tabs = document.querySelectorAll('.panel-tab');
  const tabContents = {
    'voice': document.getElementById('voiceTab'),
    'latex': document.getElementById('latexTab'),
    'symbols': document.getElementById('symbolsTab'),
  };
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      Object.values(tabContents).forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      tabContents[tab.dataset.tab].classList.add('active');
    });
  });

  function insertSymbol(latex) {
    const pos = latexInput.selectionStart || latexInput.value.length;
    latexInput.value = latexInput.value.substring(0, pos) + latex + latexInput.value.substring(pos);
    latexInput.focus();
    latexInput.selectionStart = latexInput.selectionEnd = pos + latex.length;
    renderLatex(latexInput.value);
  }

  // ========================
  //  LaTeX Input → Preview
  // ========================
  latexInput.addEventListener('input', () => renderLatex(latexInput.value));

  document.querySelectorAll('.template-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      latexInput.value = btn.dataset.latex;
      latexInput.focus();
      renderLatex(btn.dataset.latex);
    });
  });

  function renderLatex(latex) {
    if (!latex || !latex.trim()) {
      previewArea.innerHTML = '<div class="preview-placeholder">Your rendered equation will appear here</div>';
      latexCode.textContent = '—';
      currentLatex = '';
      return;
    }
    currentLatex = latex.trim();
    latexCode.textContent = currentLatex;
    try {
      katex.render(currentLatex, previewArea, { displayMode: true, throwOnError: false, trust: true, strict: false });
    } catch (e) {
      previewArea.innerHTML = `<div style="color:var(--danger);font-size:14px;">Error: ${e.message}</div>`;
    }
  }

  // Check URL params for preloaded latex
  const urlParams = new URLSearchParams(window.location.search);
  const preloadLatex = urlParams.get('latex');
  if (preloadLatex) {
    latexInput.value = decodeURIComponent(preloadLatex);
    renderLatex(latexInput.value);
  }

  // AI Refine for Home Editor
  window.refineWithAI = async function() {
    const text = latexInput.value.trim();
    if (!text) return;
    const btn = document.getElementById('aiMagicBtn');
    const originalContent = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    try {
      const result = await _aiCall({ contents: [{ parts: [{ text: `Convert this natural language math into LaTeX code: "${text}". Output ONLY the LaTeX code (no explanation). Use $$...$$ for the main equation.` }] }] });
      const cleanLatex = result.match(/\$\$([\s\S]+?)\$\$/)?.[1] || result.replace(/\$/g, '').trim();
      latexInput.value = cleanLatex;
      renderLatex(cleanLatex);
      showToast('✨ AI Refined!');
    } catch (err) {
      showToast('❌ AI Error: ' + err.message);
    }
    btn.innerHTML = originalContent;
  };

  // ========================
  //  Copy LaTeX
  // ========================
  document.getElementById('copyLatexBtn').addEventListener('click', () => {
    if (!currentLatex) { showToast('⚠️ No equation'); return; }
    navigator.clipboard.writeText(currentLatex).then(() => showToast('📋 Copied!')).catch(() => showToast('📋 Copied!'));
  });

  // ========================
  //  Save Equation
  // ========================
  document.getElementById('saveBtn').addEventListener('click', async () => {
    if (!currentLatex) { showToast('⚠️ No equation'); return; }
    try {
      const title = prompt('Equation title (optional):', '') || 'Untitled';
      await DB.saveEquation(currentLatex, title);
      showToast('💾 Equation saved!');
      loadSavedEquations();
    } catch (err) { showToast('❌ ' + err.message); }
  });

  // ========================
  //  Load Saved Equations
  // ========================
  async function loadSavedEquations() {
    const grid = document.getElementById('savedGrid');
    try {
      const equations = await DB.getEquations();
      if (!equations.length) {
        grid.innerHTML = '<div class="empty-state">No saved equations yet. Start typing!</div>';
        return;
      }
      grid.innerHTML = '';
      equations.forEach(eq => {
        const card = document.createElement('div');
        card.className = 'saved-card';

        const mathDiv = document.createElement('div');
        mathDiv.className = 'saved-card-math';
        try { katex.render(eq.latex, mathDiv, { displayMode: true, throwOnError: false }); } catch(e) { mathDiv.textContent = eq.latex; }

        const latexDiv = document.createElement('div');
        latexDiv.className = 'saved-card-latex';
        latexDiv.textContent = eq.latex;

        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'saved-card-actions';

        const loadBtn = document.createElement('button');
        loadBtn.className = 'action-btn';
        loadBtn.textContent = '📝 Load';
        loadBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          latexInput.value = eq.latex;
          renderLatex(eq.latex);
          tabs.forEach(t => t.classList.remove('active'));
          Object.values(tabContents).forEach(c => c.classList.remove('active'));
          document.getElementById('tabLatex').classList.add('active');
          tabContents['latex'].classList.add('active');
          showToast('📝 Loaded!');
        });

        const delBtn = document.createElement('button');
        delBtn.className = 'action-btn';
        delBtn.textContent = '🗑️';
        delBtn.style.color = 'var(--danger)';
        delBtn.addEventListener('click', async (e) => {
          e.stopPropagation();
          await DB.deleteEquation(eq.id);
          loadSavedEquations();
          showToast('🗑️ Deleted');
        });

        const exportBtn = document.createElement('button');
        exportBtn.className = 'action-btn';
        exportBtn.textContent = '📄 .docx';
        exportBtn.addEventListener('click', (e) => { e.stopPropagation(); exportToWord(eq.latex); });

        actionsDiv.append(loadBtn, exportBtn, delBtn);
        card.append(mathDiv, latexDiv, actionsDiv);
        grid.appendChild(card);
      });
    } catch (err) { grid.innerHTML = `<div class="empty-state">Error loading: ${err.message}</div>`; }
  }

  // Clear all
  document.getElementById('clearAllBtn').addEventListener('click', async () => {
    if (!confirm('Delete all saved equations?')) return;
    localStorage.removeItem('mv_equations');
    loadSavedEquations();
    showToast('🗑️ Cleared');
  });

  // ========================
  //  Export to Word (.docx)
  // ========================
  document.getElementById('exportWordBtn').addEventListener('click', () => {
    if (!currentLatex) { showToast('⚠️ No equation'); return; }
    exportToWord(currentLatex);
  });

  async function exportToWord(latex) {
    showToast('📄 Generating Word doc...');
    try {
      const imgData = await latexToImage(latex);
      const { Document, Packer, Paragraph, TextRun, ImageRun, HeadingLevel, AlignmentType } = docx;
      const imgBuf = dataUrlToBuffer(imgData.dataUrl);

      const doc = new Document({
        sections: [{
          children: [
            new Paragraph({ children: [new TextRun({ text: 'MathVoice — Equation Export', bold: true, size: 32, font: 'Calibri' })], heading: HeadingLevel.HEADING_1, spacing: { after: 300 } }),
            new Paragraph({ children: [new TextRun({ text: 'Equation:', bold: true, size: 24, font: 'Calibri' })], spacing: { after: 200 } }),
            new Paragraph({
              children: [new ImageRun({ data: imgBuf, transformation: { width: Math.min(imgData.width * 0.75, 550), height: Math.min(imgData.height * 0.75, 200) }, type: 'png' })],
              alignment: AlignmentType.CENTER, spacing: { after: 300 },
            }),
            new Paragraph({ children: [new TextRun({ text: 'LaTeX Code:', bold: true, size: 22, font: 'Calibri' })], spacing: { after: 100 } }),
            new Paragraph({ children: [new TextRun({ text: latex, font: 'Consolas', size: 20, color: '6C5CE7' })], spacing: { after: 200 } }),
            new Paragraph({ children: [new TextRun({ text: `Generated by MathVoice — ${new Date().toLocaleString()}`, italics: true, size: 18, color: '888888', font: 'Calibri' })] }),
          ],
        }],
      });

      const blob = await Packer.toBlob(doc);
      downloadBlob(blob, `mathvoice-${Date.now()}.docx`);
      showToast('✅ Word document downloaded!');
    } catch (err) {
      console.error(err);
      showToast('❌ Export failed: ' + err.message);
    }
  }

  function latexToImage(latex) {
    return new Promise((resolve, reject) => {
      const container = document.createElement('div');
      container.style.cssText = 'position:absolute;left:-9999px;top:-9999px;background:white;padding:20px;';
      document.body.appendChild(container);
      try { katex.render(latex, container, { displayMode: true, throwOnError: false, output: 'html' }); } catch (e) { document.body.removeChild(container); reject(e); return; }
      const w = container.scrollWidth + 40, h = container.scrollHeight + 40;
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml" style="font-family:KaTeX_Main,serif;font-size:24px;background:white;padding:20px;"><link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css"/>${container.innerHTML}</div></foreignObject></svg>`;
      const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = w * 2; canvas.height = h * 2;
        const ctx = canvas.getContext('2d');
        ctx.scale(2, 2); ctx.fillStyle = 'white'; ctx.fillRect(0, 0, w, h); ctx.drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url); document.body.removeChild(container);
        resolve({ dataUrl: canvas.toDataURL('image/png'), width: w, height: h });
      };
      img.onerror = () => {
        URL.revokeObjectURL(url); document.body.removeChild(container);
        const c = document.createElement('canvas'); c.width = 600; c.height = 100;
        const cx = c.getContext('2d'); cx.fillStyle = 'white'; cx.fillRect(0, 0, 600, 100);
        cx.fillStyle = 'black'; cx.font = '20px serif'; cx.fillText(latex, 20, 50);
        resolve({ dataUrl: c.toDataURL('image/png'), width: 600, height: 100 });
      };
      img.src = url;
    });
  }

  function dataUrlToBuffer(dataUrl) {
    const b = atob(dataUrl.split(',')[1]);
    const a = new Uint8Array(b.length);
    for (let i = 0; i < b.length; i++) a[i] = b.charCodeAt(i);
    return a.buffer;
  }

  function downloadBlob(blob, name) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { document.body.removeChild(a); }, 100);
  }

  // ========================
  //  Scroll animations
  // ========================
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) entry.target.style.animation = 'fadeInUp 0.6s ease forwards';
    });
  }, { threshold: 0.1 });
  document.querySelectorAll('.feature-card, .step').forEach(el => { el.style.opacity = '0'; observer.observe(el); });

  // Initial load
  loadSavedEquations();
});

// ========================
//  Global Functions (called from HTML onclick)
// ========================
function showModal(id) { document.getElementById(id).classList.add('show'); }
function hideModal(id) { document.getElementById(id).classList.remove('show'); }

function toggleUserDropdown() {
  document.getElementById('userDropdown').classList.toggle('show');
}
document.addEventListener('click', (e) => {
  if (!e.target.closest('.user-badge') && !e.target.closest('.user-dropdown')) {
    const dd = document.getElementById('userDropdown');
    if (dd) dd.classList.remove('show');
  }
});

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  const errEl = document.getElementById('loginError');
  errEl.textContent = '';

  try {
    await Auth.signIn(email, password);
    hideModal('loginModal');
    showToast('✅ Logged in successfully!');
  } catch (err) {
    errEl.textContent = err.message || 'Login failed';
  }
}

async function handleSignup(e) {
  e.preventDefault();
  const name = document.getElementById('signupName').value;
  const email = document.getElementById('signupEmail').value;
  const password = document.getElementById('signupPassword').value;
  const confirm = document.getElementById('signupConfirm').value;
  const errEl = document.getElementById('signupError');
  errEl.textContent = '';

  if (password !== confirm) { errEl.textContent = 'Passwords do not match'; return; }

  try {
    await Auth.signUp(email, password, name);
    hideModal('signupModal');
    showToast('✅ Account created! Check email for confirmation.');
  } catch (err) {
    errEl.textContent = err.message || 'Signup failed';
  }
}

async function handleForgotPassword() {
  const email = document.getElementById('loginEmail').value;
  if (!email) { document.getElementById('loginError').textContent = 'Enter your email first'; return; }
  try {
    await Auth.resetPassword(email);
    showToast('📧 Password reset email sent!');
  } catch (err) {
    document.getElementById('loginError').textContent = err.message;
  }
}

async function handleLogout() {
  try {
    await Auth.signOut();
    showToast('👋 Logged out');
    window.location.reload();
  } catch (err) { showToast('❌ ' + err.message); }
}

function showSaveToDocModal() { showModal('saveDocModal'); }
function showSaveToAssignmentModal() { showModal('saveAssignmentModal'); }

async function handleSaveDocument(e) {
  e.preventDefault();
  const title = document.getElementById('docTitle').value;
  const content = document.getElementById('docContent').value;
  const latex = document.getElementById('latexInput')?.value || '';
  try {
    await DB.saveDocument(title, content, latex ? [latex] : []);
    hideModal('saveDocModal');
    showToast('📄 Document saved!');
  } catch (err) { showToast('❌ ' + err.message); }
}

async function handleSaveAssignment(e) {
  e.preventDefault();
  const title = document.getElementById('assignTitle').value;
  const subject = document.getElementById('assignSubject').value;
  const due = document.getElementById('assignDue').value;
  const notes = document.getElementById('assignNotes').value;
  const latex = document.getElementById('latexInput')?.value || '';
  try {
    await DB.saveAssignment(title, subject, due, latex ? [latex] : [], notes);
    hideModal('saveAssignmentModal');
    showToast('📝 Assignment saved!');
  } catch (err) { showToast('❌ ' + err.message); }
}

function openSettings() {
  const s = DigiMathSettings.get();
  if (document.getElementById('settingProvider')) document.getElementById('settingProvider').value = s.provider || 'opencode';
  if (document.getElementById('settingOpencodeKey')) document.getElementById('settingOpencodeKey').value = s.opencodeKey || '';
  if (document.getElementById('settingAnthropicKey')) document.getElementById('settingAnthropicKey').value = s.anthropicKey || '';
  if (document.getElementById('settingModel')) document.getElementById('settingModel').value = s.model;
  toggleProviderFields();
  showModal('settingsModal');
}

function toggleProviderFields() {
  const provider = document.getElementById('settingProvider').value;
  const ocGroup = document.getElementById('opencodeKeyGroup');
  const anGroup = document.getElementById('anthropicKeyGroup');
  
  if (ocGroup) ocGroup.style.display = provider === 'opencode' ? 'block' : 'none';
  if (anGroup) anGroup.style.display = provider === 'anthropic' ? 'block' : 'none';
}

function saveSettings() {
  const data = {
    provider: document.getElementById('settingProvider').value,
    opencodeKey: document.getElementById('settingOpencodeKey').value,
    anthropicKey: document.getElementById('settingAnthropicKey').value,
    model: document.getElementById('settingModel').value
  };
  DigiMathSettings.save(data);
  hideModal('settingsModal');
  showToast('✅ Settings saved! Reloading...');
  setTimeout(() => window.location.reload(), 1000);
}

let _toastTimeout;
function showToast(msg) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(_toastTimeout);
  _toastTimeout = setTimeout(() => el.classList.remove('show'), 3000);
}
