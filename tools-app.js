/**
 * DigiMath — AI Tools Application Logic
 * Powered by Google Gemini + Math.js + Wikipedia API
 */

let currentTool = 'solver';
let lastSolution = '';
let lastOCRLatex = '';
let lastThesisContent = '';
let currentThesisMode = 'abstract';
let currentSolverModel = 'gemini-2.0-flash';
let currentResearchModel = 'gemini-2.0-flash';
let currentResearchTopic = '';
let uploadedImageBase64 = '';
let uploadedImageMime = '';

// Enforce Login for Tools
Auth.requireLogin();

// ========================
//  State Management
// ========================
function switchTool(btn) {
  document.querySelectorAll('.tool-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tool-panel').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  currentTool = btn.dataset.tool;
  document.getElementById('tool-' + currentTool).classList.add('active');
}

// ========================
//  Navbar toggle
// ========================
const navToggle = document.getElementById('navToggle');
if (navToggle) {
  navToggle.addEventListener('click', () => {
    const navLinks = document.getElementById('navLinks');
    if (navLinks) navLinks.classList.toggle('open');
  });
}

// ========================
//  RESEARCH
// ========================
function setResearchModel(btn, model) {
  currentResearchModel = model;
  btn.parentElement.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

function quickSearch(topic) {
  const inp = document.getElementById('wikiInput');
  if (inp) {
    inp.value = topic;
    searchWiki();
  }
}

// ========================
//  AI SOLVER
// ========================
function setSolverModel(btn, model) {
  currentSolverModel = model;
  btn.parentElement.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

function setPreset(text) {
  document.getElementById('solverInput').value = text;
}

async function solveMath() {
  const problem = document.getElementById('solverInput').value.trim();
  if (!problem) { showToast('⚠️ Please enter a math problem'); return; }

  const output = document.getElementById('solverOutput');

  // STEP 1: Check Local Knowledge Directory (Soft Solution)
  const localSolution = window.MathDirectory ? window.MathDirectory.find(problem) : null;
  if (localSolution) {
    showToast('✨ Instant Soft Solution Found!');
    output.innerHTML = `
      <div style="background:var(--accent-glow); padding:16px; border-radius:12px; border:1px solid var(--accent-primary); margin-bottom:16px">
        <div style="font-weight:bold; color:var(--accent-secondary); margin-bottom:8px"><i class="fa-solid fa-bolt"></i> Local Knowledge Match</div>
        ${formatAIResponse(localSolution)}
      </div>
      <div style="text-align:center; margin-top:20px">
        <p style="font-size:13px; color:var(--text-dim); margin-bottom:12px">Not satisfied? Get a deeper PhD-level analysis:</p>
        <button class="btn btn-secondary" onclick="solveMathCloud()" style="padding:8px 20px; font-size:13px">🧠 Solve with Cloud AI</button>
      </div>
    `;
    if (window.renderMathInElement) {
        renderMathInElement(output, { delimiters: [{ left: '$$', right: '$$', display: true }, { left: '$', right: '$', display: false }], throwOnError: false });
    }
    return;
  }

  // STEP 2: Proceed to Cloud AI
  solveMathCloud();
}

async function solveMathCloud() {
  const problem = document.getElementById('solverInput').value.trim();
  const detailed = document.getElementById('optDetailed').checked;
  const latex = document.getElementById('optLatex').checked;
  const explain = document.getElementById('optExplain').checked;

  const btn = document.getElementById('solveBtn');
  const btnText = document.getElementById('solveBtnText');
  const output = document.getElementById('solverOutput');

  btn.classList.add('loading');
  btnText.textContent = '⏳ Thinking...';
  output.innerHTML = '<div class="output-placeholder"><div style="font-size:32px">⏳</div><div>AI is solving your problem...</div></div>';

  const prompt = `You are an expert MSc/PhD-level mathematics professor. Solve the following problem completely.
Problem: ${problem}
Instructions:
${detailed ? '- Show ALL steps in detail, numbered clearly' : '- Show main steps only'}
${latex ? '- Include LaTeX code for every equation using $...$ for inline and $$...$$ for display' : ''}
${explain ? '- Explain the mathematical concepts and theorems used at each step' : ''}
- Format with markdown and LaTeX ($$...$$).`;

  try {
    const result = await _aiCall({ contents: [{ parts: [{ text: prompt }] }] }, { model: currentSolverModel });
    lastSolution = result;
    output.innerHTML = formatAIResponse(result);
    if (window.renderMathInElement) {
        renderMathInElement(output, { delimiters: [{ left: '$$', right: '$$', display: true }, { left: '$', right: '$', display: false }], throwOnError: false });
    }
    showToast(`✅ Solved with ${currentSolverModel}`);
  } catch (err) {
    output.innerHTML = `<div style="color:var(--danger);padding:16px">❌ Error: ${err.message}</div>`;
    showToast('❌ ' + err.message);
  }

  btn.classList.remove('loading');
  btnText.textContent = '🧮 Solve with AI';
}

function copySolution() {
  navigator.clipboard.writeText(lastSolution).then(() => showToast('📋 Copied!'));
}

async function exportSolutionWord() {
  if (!lastSolution) return;
  showToast('📄 Generating Word document...');
  await exportToDocx('Math Solution', lastSolution);
}

// ========================
//  IMAGE OCR
// ========================
function handleDragOver(e) {
  e.preventDefault();
  document.getElementById('uploadZone').classList.add('dragover');
}

function handleDrop(e) {
  e.preventDefault();
  document.getElementById('uploadZone').classList.remove('dragover');
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) processImageFile(file);
}

function handleImageUpload(e) {
  const file = e.target.files[0];
  if (file) processImageFile(file);
}

function processImageFile(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const dataUrl = e.target.result;
    uploadedImageBase64 = dataUrl.split(',')[1];
    uploadedImageMime = file.type;
    document.getElementById('imagePreview').src = dataUrl;
    document.getElementById('imagePreviewBox').style.display = '';
    document.getElementById('uploadZone').style.display = 'none';
    showToast('✅ Image loaded!');
  };
  reader.readAsDataURL(file);
}

function clearImage() {
  uploadedImageBase64 = '';
  uploadedImageMime = '';
  document.getElementById('imageInput').value = '';
  document.getElementById('imagePreviewBox').style.display = 'none';
  document.getElementById('uploadZone').style.display = '';
  document.getElementById('ocrOutput').innerHTML = '<div class="output-placeholder"><div style="font-size:48px;margin-bottom:16px;">📷</div><div>Upload an image of math equations</div></div>';
  document.getElementById('ocrLatexPreview').style.display = 'none';
}

async function runOCR() {
  if (!uploadedImageBase64) { showToast('⚠️ Please upload an image first'); return; }

  const btn = document.getElementById('ocrBtn');
  const btnText = document.getElementById('ocrBtnText');
  const output = document.getElementById('ocrOutput');

  btn.classList.add('loading');
  btnText.textContent = '⏳ Local Tracing...';
  output.innerHTML = '<div class="output-placeholder"><div style="font-size:32px">🔍</div><div>Tracing image locally...</div></div>';

  try {
    // STEP 1: Attempt Local OCR (Tesseract.js)
    const tesseractResult = await Tesseract.recognize(`data:${uploadedImageMime};base64,${uploadedImageBase64}`, 'eng');
    const text = tesseractResult.data.text.trim();

    // STEP 2: Check Local Knowledge Directory
    const localMatch = window.MathDirectory ? window.MathDirectory.find(text) : null;
    if (localMatch) {
      showToast('✨ Local Match Found!');
      output.innerHTML = `
        <div style="background:var(--accent-glow); padding:16px; border-radius:12px; border:1px solid var(--accent-primary); margin-bottom:16px">
          <div style="font-weight:bold; color:var(--accent-secondary); margin-bottom:8px"><i class="fa-solid fa-bolt"></i> Local Knowledge Match</div>
          ${formatAIResponse(localMatch)}
        </div>
        <div style="text-align:center; margin-top:20px">
          <button class="btn btn-secondary" onclick="runOCRCloud()" style="padding:8px 20px; font-size:13px">🧠 Deep AI Extract</button>
        </div>
      `;
      if (window.renderMathInElement) {
          renderMathInElement(output, { delimiters: [{ left: '$$', right: '$$', display: true }, { left: '$', right: '$', display: false }], throwOnError: false });
      }
      btn.classList.remove('loading');
      btnText.textContent = '📷 Extract Math from Image';
      return;
    }
    runOCRCloud();
  } catch (err) {
    runOCRCloud();
  }
}

async function runOCRCloud() {
  const mode = document.querySelector('input[name="ocrMode"]:checked').value;
  const btn = document.getElementById('ocrBtn');
  const btnText = document.getElementById('ocrBtnText');
  const output = document.getElementById('ocrOutput');

  btn.classList.add('loading');
  btnText.textContent = '⏳ AI Vision...';
  output.innerHTML = '<div class="output-placeholder"><div style="font-size:32px">☁️</div><div>Using Cloud AI...</div></div>';

  let prompt = '';
  if (mode === 'latex') {
    prompt = `Extract all mathematical equations from this image and convert them to LaTeX. Use $$...$$ for every equation. Output ONLY LaTeX.`;
  } else if (mode === 'solve') {
    prompt = `You are an expert math professor. Extract the problem from this image and solve it step-by-step. Use LaTeX ($$...$$).`;
  } else {
    prompt = `Analyze this math image. Extract equations in LaTeX ($$...$$) and explain them thoroughly.`;
  }

  try {
    const result = await GeminiAI.vision(uploadedImageBase64, uploadedImageMime, prompt);
    lastOCRLatex = result;
    output.innerHTML = formatAIResponse(result);
    if (window.renderMathInElement) {
        renderMathInElement(output, { delimiters: [{ left: '$$', right: '$$', display: true }, { left: '$', right: '$', display: false }], throwOnError: false });
    }
    
    const latexMatch = result.match(/\$\$([\s\S]+?)\$\$/);
    if (latexMatch) {
      const previewEl = document.getElementById('ocrMathPreview');
      document.getElementById('ocrLatexPreview').style.display = '';
      try { katex.render(latexMatch[1].trim(), previewEl, { displayMode: true, throwOnError: false }); } catch(e) {}
    }

    document.getElementById('copyOcrBtn').style.display = 'block';
    document.getElementById('loadEditorBtn').style.display = 'block';
    document.getElementById('exportOcrBtn').style.display = 'block';
    showToast('✅ AI extraction complete!');
  } catch (err) {
    output.innerHTML = `<div style="color:var(--danger)">❌ ${err.message}</div>`;
  }
  btn.classList.remove('loading');
  btnText.textContent = '📷 Extract Math from Image';
}

function copyOCR() {
  navigator.clipboard.writeText(lastOCRLatex).then(() => showToast('📋 Copied!'));
}

function loadOCRInEditor() {
  const match = lastOCRLatex.match(/\$\$([\s\S]+?)\$\$/);
  const latex = match ? match[1].trim() : lastOCRLatex;
  window.location.href = `index.html#editor-section?latex=${encodeURIComponent(latex)}`;
}

async function exportOCRWord() {
  if (!lastOCRLatex) return;
  showToast('📄 Generating Word document...');
  await exportToDocx('Math OCR Result', lastOCRLatex);
}

// ========================
//  CALCULATOR
// ========================
const calcHistory = [];

function calculate() {
  const input = document.getElementById('calcInput').value.trim();
  if (!input) return;
  try {
    const result = math.evaluate(input);
    const formatted = typeof result === 'object' ? math.format(result, { precision: 10 }) : math.format(result, { precision: 10 });
    addCalcHistory(input, formatted);
    showToast(`= ${formatted}`);
  } catch (err) {
    addCalcHistory(input, 'Error: ' + err.message, true);
  }
}

function addCalcHistory(expr, result, isError = false) {
  const histEl = document.getElementById('calcHistory');
  const entry = document.createElement('div');
  entry.className = 'calc-entry';
  entry.innerHTML = `<span class="expr">${expr}</span> <span style="color:var(--text-dim)">→</span> <span class="result" style="${isError ? 'color:var(--danger)' : ''}">${result}</span>`;
  histEl.prepend(entry);
  calcHistory.unshift({ expr, result });
}

function insertCalc(text) {
  const inp = document.getElementById('calcInput');
  const pos = inp.selectionStart || inp.value.length;
  inp.value = inp.value.substring(0, pos) + text + inp.value.substring(pos);
  inp.focus();
}

function clearCalc() {
  document.getElementById('calcInput').value = '';
  document.getElementById('calcHistory').innerHTML = '';
}

function calcMatrix() {
  const matrixStr = document.getElementById('matrixInput').value.trim();
  const op = document.getElementById('matrixOp').value.trim();
  const out = document.getElementById('matrixOutput');
  out.style.display = '';
  if (!matrixStr) { out.textContent = 'Please enter matrix data'; return; }
  try {
    const rows = matrixStr.split(';').map(r => r.trim().split(',').map(v => parseFloat(v.trim())));
    const A = math.matrix(rows);
    const fullExpr = op.replace(/\bA\b/g, JSON.stringify(rows));
    const result = math.evaluate(fullExpr.replace(/\bA\b/g, 'A'), { A });
    out.textContent = 'Result:\n' + math.format(result, { precision: 6 });
  } catch (err) {
    out.style.color = 'var(--danger)';
    out.textContent = 'Error: ' + err.message;
  }
}

function calcStats(type) {
  const valStr = document.getElementById('statsInput').value;
  const vals = valStr.split(',').map(v => parseFloat(v.trim())).filter(v => !isNaN(v));
  const out = document.getElementById('statsOutput');
  out.style.display = '';
  out.style.color = 'var(--accent-light)';
  if (!vals.length) { out.textContent = 'Please enter numbers'; return; }
  try {
    if (type === 'all') {
      out.textContent = [
        `Count:    ${vals.length}`,
        `Mean:     ${math.format(math.mean(vals), {precision:6})}`,
        `Median:   ${math.format(math.median(vals), {precision:6})}`,
        `Std Dev:  ${math.format(math.std(vals), {precision:6})}`,
        `Variance: ${math.format(math.variance(vals), {precision:6})}`,
        `Min:      ${math.min(vals)}`,
        `Max:      ${math.max(vals)}`,
        `Sum:      ${math.sum(vals)}`,
      ].join('\n');
    } else {
      const fns = { mean: math.mean, median: math.median, std: math.std, variance: math.variance, min: math.min, max: math.max };
      out.textContent = `${type}: ${math.format(fns[type](vals), {precision:8})}`;
    }
  } catch (err) { out.textContent = 'Error: ' + err.message; }
}

async function explainCalc() {
  const q = document.getElementById('calcInput').value.trim();
  if (!q) { showToast('⚠️ Enter a question or expression'); return; }
  const out = document.getElementById('calcHistory');
  const entry = document.createElement('div');
  entry.className = 'calc-entry';
  entry.innerHTML = `<div style="font-size:12px;color:var(--accent-primary);margin-bottom:8px">AI Explanation Request...</div>`;
  out.prepend(entry);
  try {
    const result = await GeminiAI.gemini(`You are a math professor. Explain this clearly for an MSc student: "${q}". Use simple language with examples. Include LaTeX ($$...$$) where helpful.`);
    entry.innerHTML = `<div style="padding:10px;background:rgba(255,255,255,0.05);border-radius:8px">${formatAIResponse(result)}</div>`;
    if (window.renderMathInElement) {
        renderMathInElement(entry, { delimiters: [{ left: '$$', right: '$$', display: true }, { left: '$', right: '$', display: false }], throwOnError: false });
    }
  } catch (err) { entry.innerHTML = `<div style="color:var(--danger)">❌ ${err.message}</div>`; }
}

// ========================
//  THESIS WRITER
// ========================
function setThesisMode(btn, mode) {
  document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  currentThesisMode = mode;
  const placeholders = {
    abstract: 'Describe your thesis topic and key findings (3-5 sentences). AI will write a formal academic abstract.',
    introduction: 'Describe your research area and what you are studying. AI will write a full introduction section.',
    proof: 'State the theorem or proposition you want to prove. AI will write a rigorous mathematical proof.',
    conclusion: 'Describe your findings and results. AI will write a formal conclusion section.',
    improve: 'Paste your existing text here. AI will improve clarity, grammar, and academic style.',
    references: 'List your topics or authors. AI will generate properly formatted references.',
  };
  document.getElementById('thesisInput').placeholder = placeholders[mode] || '';
}

async function runThesis() {
  const input = document.getElementById('thesisInput').value.trim();
  if (!input) { showToast('⚠️ Please describe your topic'); return; }

  const btn = document.getElementById('thesisBtnText');
  const originalText = btn.textContent;
  btn.textContent = '⏳ Generating...';

  const output = document.getElementById('thesisOutput');
  output.innerHTML = '<div class="output-placeholder"><div>⏳ AI is writing...</div></div>';

  const prompts = {
    abstract: `Write a formal academic abstract for an MSc thesis. Topic/Summary: "${input}". The abstract should be 250-300 words, covering: background, objectives, methodology, results, and conclusions. Use formal academic language.`,
    proof: `Write a rigorous mathematical proof for the following theorem/statement: "${input}". Format with: Theorem statement, Proof heading, clear logical steps, and QED. Use LaTeX ($$...$$) for all equations. Show every step clearly.`,
    conclusion: `Write a formal Conclusion section for an MSc thesis. Research/findings: "${input}". Include: summary of work, key contributions, limitations, and future research directions. Approximately 400-500 words. Academic language.`,
  };

  try {
    const result = await GeminiAI.gemini(prompts[currentThesisMode] || prompts.abstract);
    lastThesisContent = result;
    output.innerHTML = formatAIResponse(result);
    if (window.renderMathInElement) {
        renderMathInElement(output, { delimiters: [{ left: '$$', right: '$$', display: true }, { left: '$', right: '$', display: false }], throwOnError: false });
    }
    document.getElementById('copyThesisBtn').style.display = 'block';
    document.getElementById('exportThesisBtn').style.display = 'block';
    showToast('✅ Content generated!');
  } catch (err) {
    output.innerHTML = `<div style="color:var(--danger);padding:16px">❌ ${err.message}</div>`;
    showToast('❌ ' + err.message);
  }
  btn.textContent = originalText;
}

function copyThesis() { navigator.clipboard.writeText(lastThesisContent).then(() => showToast('📋 Copied!')); }
async function exportThesisWord() { await exportToDocx('Thesis Content', lastThesisContent); }

async function summarizeDoc() {
  const text = document.getElementById('docInput').value.trim();
  if (!text) { showToast('⚠️ Please paste some text'); return; }
  const btn = document.getElementById('docBtnText');
  const originalText = btn.textContent;
  btn.textContent = '⏳ Summarizing...';
  const out = document.getElementById('docOutput');
  out.innerHTML = '<div class="output-placeholder"><div>⏳ AI is reading...</div></div>';
  try {
    const result = await GeminiAI.gemini(`Summarize the following academic text/document for an MSc student. Highlight key findings, methodology, and conclusions. Use LaTeX ($$...$$) for any equations. Text: "${text.substring(0, 5000)}"`);
    lastDocSummary = result;
    out.innerHTML = formatAIResponse(result);
    if (window.renderMathInElement) {
        renderMathInElement(out, { delimiters: [{ left: '$$', right: '$$', display: true }, { left: '$', right: '$', display: false }], throwOnError: false });
    }
    document.getElementById('copyDocBtn').style.display = 'block';
    showToast('✅ Document summarized!');
  } catch (err) { out.innerHTML = `<div style="color:var(--danger)">❌ ${err.message}</div>`; }
  btn.textContent = originalText;
}

let lastDocSummary = '';
function copyDoc() { navigator.clipboard.writeText(lastDocSummary).then(() => showToast('📋 Copied!')); }

// ========================
//  RESEARCH (Wikipedia + AI)
// ========================
async function searchWiki() {
  const query = document.getElementById('wikiInput').value.trim();
  if (!query) { showToast('⚠️ Enter a search term'); return; }
  const out = document.getElementById('wikiResult');
  out.innerHTML = '<div class="output-placeholder"><div>⏳ Searching...</div></div>';
  try {
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Topic not found on Wikipedia');
    const data = await res.json();
    out.innerHTML = `
      <div class="wiki-article-title"><i class="fa-solid fa-book-open"></i> ${data.title}</div>
      <div class="wiki-article-summary">${data.extract}</div>
      <a class="wiki-read-more" href="${data.content_urls?.desktop?.page}" target="_blank">→ Read full article on Wikipedia</a>
      <div style="margin-top:16px">
        <button class="preset-btn" onclick="askAIAboutWiki('${data.title}','${data.extract.replace(/'/g, "\\'")}')"><i class="fa-solid fa-robot"></i> Ask AI to explain this deeper</button>
        <button class="preset-btn" style="margin-left:6px" onclick="askAIAboutWiki('${data.title}','Give MSc-level problems related to ${data.title}')"><i class="fa-solid fa-file-pen"></i> Get practice problems</button>
      </div>
    `;
    showToast('✅ Found: ' + data.title);
  } catch (err) {
    out.innerHTML = `<div style="color:var(--danger);padding:16px">❌ ${err.message}<br><br><small>Try a different search term</small></div>`;
  }
}

// Redundant quickSearch removed (using the one at the top)

async function askAIAboutWiki(title, context) {
  const aiOut = document.getElementById('researchAIOutput');
  aiOut.style.display = '';
  aiOut.innerHTML = '<div class="output-placeholder"><div>⏳ AI thinking...</div></div>';
  try {
    const result = await GeminiAI.gemini(`You are an expert MSc-level math research assistant. Use this Wikipedia summary of "${title}" as context: "${context}". Please provide a deep academic explanation or solve the requested problems. Use LaTeX equations ($$...$$).`);
    aiOut.innerHTML = formatAIResponse(result);
    if (window.renderMathInElement) {
        renderMathInElement(aiOut, { delimiters: [{ left: '$$', right: '$$', display: true }, { left: '$', right: '$', display: false }], throwOnError: false });
    }
  } catch (err) { aiOut.innerHTML = `<div style="color:var(--danger)">❌ ${err.message}</div>`; }
}

async function askResearchAI() {
  const q = document.getElementById('researchAIInput').value.trim();
  if (!q) { showToast('⚠️ Enter a question'); return; }
  const btn = document.getElementById('researchAIBtnText');
  btn.textContent = '⏳ Thinking...';
  const aiOut = document.getElementById('researchAIOutput');
  aiOut.style.display = '';
  aiOut.innerHTML = '<div class="output-placeholder"><div>⏳ AI thinking...</div></div>';
  try {
    const result = await GeminiAI.gemini(`You are an expert MSc-level mathematics research assistant. Answer this thoroughly: "${q}". Include LaTeX equations ($$...$$) and markdown formatting. Be detailed and accurate.`);
    aiOut.innerHTML = formatAIResponse(result);
    if (window.renderMathInElement) {
        renderMathInElement(aiOut, { delimiters: [{ left: '$$', right: '$$', display: true }, { left: '$', right: '$', display: false }], throwOnError: false });
    }
  } catch (err) { aiOut.innerHTML = `<div style="color:var(--danger)">❌ ${err.message}</div>`; }
  btn.textContent = '🤖 Ask AI';
}

// ========================
//  WORD EXPORT (shared)
// ========================
async function exportToDocx(title, content) {
  try {
    const { Document, Packer, Paragraph, TextRun, HeadingLevel } = docx;
    const lines = content.split('\n').filter(l => l.trim());
    const children = [
      new Paragraph({ children: [new TextRun({ text: title, bold: true, size: 36, font: 'Calibri' })], heading: HeadingLevel.HEADING_1, spacing: { after: 400 } }),
      new Paragraph({ children: [new TextRun({ text: `Generated by DigiMath AI — ${new Date().toLocaleString()}`, italics: true, size: 18, color: '888888', font: 'Calibri' })], spacing: { after: 400 } }),
      ...lines.map(line => {
        const cleanLine = line.replace(/\*\*/g, '').replace(/##+ /g, '').replace(/\$\$/g, '').replace(/\$/g, '');
        const isHeading = line.startsWith('## ') || line.startsWith('# ');
        return new Paragraph({
          children: [new TextRun({ text: cleanLine, bold: isHeading, size: isHeading ? 26 : 22, font: 'Calibri' })],
          spacing: { after: isHeading ? 200 : 120 },
        });
      }),
    ];
    const doc = new Document({ sections: [{ children }] });
    const blob = await Packer.toBlob(doc);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `digimath-${title.toLowerCase().replace(/ /g,'-')}-${Date.now()}.docx`;
    document.body.appendChild(a); a.click();
    setTimeout(() => document.body.removeChild(a), 100);
    showToast('✅ Word document downloaded!');
  } catch (err) { showToast('❌ Export failed: ' + err.message); }
}

// ========================
//  Format AI response → HTML
// ========================
function formatAIResponse(text) {
  if (!text) return '';
  return text
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h2>$1</h2>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/^\d+\. (.+)$/gm, '<div class="step-block"><span class="step-num">$&</span></div>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
    .replace(/\n\n/g, '<br><br>')
    .replace(/\n/g, '<br>');
}

// ========================
//  NEWTON API (Quick Math)
// ========================
async function runNewton(operation) {
  const expr = document.getElementById('newtonInput').value.trim();
  if (!expr) { showToast('⚠️ Enter an expression'); return; }
  const output = document.getElementById('newtonOutput');
  output.innerHTML = '<div class="output-placeholder"><div>⏳ Calculating...</div></div>';

  try {
    const data = await MathAPIs.newton(operation, expr);
    const opNames = {
      simplify: 'Simplify', factor: 'Factor', derive: 'Derivative',
      integrate: 'Integral', zeroes: 'Zeros', cos: 'Cosine',
      sin: 'Sine', tan: 'Tangent', log: 'Logarithm', abs: 'Absolute Value'
    };

    output.innerHTML = `
      <h2>⚡ ${opNames[operation] || operation}</h2>
      <div class="step-block"><strong>Input:</strong> <code>${data.expression}</code></div>
      <div class="step-block" style="border-left-color:var(--accent2);margin-top:12px">
        <strong>Result:</strong> <code style="font-size:18px;color:var(--accent2)">${data.result}</code>
      </div>
      <br>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        <button class="preset-btn" onclick="navigator.clipboard.writeText('${String(data.result).replace(/'/g,"\\'")}').then(()=>showToast('📋 Copied!'))">📋 Copy Result</button>
        <button class="preset-btn" onclick="document.getElementById('newtonInput').value='${String(data.result).replace(/'/g,"\\'")}';showToast('✅ Loaded as input')">🔄 Use as Input</button>
      </div>
    `;

    // Try to render as LaTeX
    const latexResult = data.result.toString()
      .replace(/\*/g, ' \\cdot ')
      .replace(/\^/g, '^')
      .replace(/sqrt/g, '\\sqrt');
    const previewEl = document.getElementById('newtonMathPreview');
    const previewBox = document.getElementById('newtonLatexPreview');
    previewBox.style.display = '';
    try { katex.render(latexResult, previewEl, { displayMode: true, throwOnError: false }); } catch(e) { previewEl.textContent = data.result; }

    showToast('✅ ' + opNames[operation] + ' complete!');
  } catch (err) {
    output.innerHTML = `<div style="color:var(--danger);padding:16px">❌ Error: ${err.message}<br><br><small>Make sure your expression uses <strong>x</strong> as variable. Example: x^2 + 2x + 1</small></div>`;
    showToast('❌ ' + err.message);
  }
}

function openSettings() {
  const s = DigiMathSettings.get();
  document.getElementById('settingProvider').value = s.provider;
  document.getElementById('settingGeminiKey').value = s.geminiKey || '';
  document.getElementById('settingAnthropicKey').value = s.anthropicKey || '';
  document.getElementById('settingModel').value = s.model;
  showModal('settingsModal');
}

function saveSettings() {
  const data = {
    provider: document.getElementById('settingProvider').value,
    geminiKey: document.getElementById('settingGeminiKey').value,
    anthropicKey: document.getElementById('settingAnthropicKey').value,
    model: document.getElementById('settingModel').value
  };
  DigiMathSettings.save(data);
  hideModal('settingsModal');
  showToast('✅ Settings saved! Reloading...');
  setTimeout(() => window.location.reload(), 1000);
}

function showModal(id) { document.getElementById(id).classList.add('active'); }
function hideModal(id) { document.getElementById(id).classList.remove('active'); }

// ========================
//  Toast
// ========================
let _t;
function showToast(msg) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg; el.classList.add('show');
  clearTimeout(_t); _t = setTimeout(() => el.classList.remove('show'), 3000);
}
