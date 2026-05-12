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
document.getElementById('navToggle').addEventListener('click', () => {
  document.getElementById('navLinks').classList.toggle('open');
});

// ========================
//  RESEARCH
// ========================
function setResearchModel(btn, model) {
  currentResearchModel = model;
  btn.parentElement.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

function quickSearch(topic) {
  document.getElementById('wikiQuery').value = topic;
  searchWiki();
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

  const detailed = document.getElementById('optDetailed').checked;
  const latex = document.getElementById('optLatex').checked;
  const explain = document.getElementById('optExplain').checked;

  const btn = document.getElementById('solveBtn');
  const btnText = document.getElementById('solveBtnText');
  btn.classList.add('loading');
  btnText.textContent = '⏳ Solving...';

  const output = document.getElementById('solverOutput');
  output.innerHTML = '<div class="output-placeholder"><div style="font-size:32px">⏳</div><div>AI is solving your problem...</div></div>';

  const prompt = `You are an expert MSc/PhD-level mathematics professor. Solve the following problem completely.

Problem: ${problem}

Instructions:
${detailed ? '- Show ALL steps in detail, numbered clearly' : '- Show main steps only'}
${latex ? '- Include LaTeX code for every equation using $...$ for inline and $$...$$ for display' : ''}
${explain ? '- Explain the mathematical concepts and theorems used at each step' : ''}
- Use clear headings for each section
- At the end, provide a clear final answer
- Format your response with markdown (use ## for headings, **bold** for key terms)
- For any equation, put the LaTeX in $$...$$ blocks`;

  const btn = document.getElementById('solveBtn');
  const btnText = document.getElementById('solveBtnText');
  const output = document.getElementById('solverOutput');

  btn.classList.add('loading');
  btnText.textContent = '⏳ Thinking...';

  const prompt = `Solve this math problem: ${input}
Instructions:
${detailed ? '- Show ALL steps in detail, numbered clearly' : '- Show main steps only'}
- Use clear headings for each section
- At the end, provide a clear final answer
- Format your response with markdown (use ## for headings, **bold** for key terms)
- For any equation, put the LaTeX in $$...$$ blocks`;

  try {
    const result = await _aiCall({ contents: [{ parts: [{ text: prompt }] }] }, { model: currentSolverModel });
    lastSolution = result;
    output.innerHTML = formatAIResponse(result);
    renderMathInElement(output, { delimiters: [{ left: '$$', right: '$$', display: true }, { left: '$', right: '$', display: false }], throwOnError: false });
    showToast(`✅ Solved with ${currentSolverModel}`);
  } catch (err) {
    output.innerHTML = `<div style="color:var(--danger);padding:16px">❌ Error: ${err.message}</div>`;
    showToast('❌ ' + err.message);
  }

  btn.classList.remove('loading');
  btnText.textContent = '🧮 Solve with AI';
}
  } catch (err) {
    output.innerHTML = `<div style="color:var(--danger);padding:16px">❌ Error: ${err.message}<br><br>Please check your Gemini API key or try again.</div>`;
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

  const mode = document.querySelector('input[name="ocrMode"]:checked').value;
  const btn = document.getElementById('ocrBtn');
  const btnText = document.getElementById('ocrBtnText');
  btn.classList.add('loading');
  btnText.textContent = '⏳ Processing image...';

  const output = document.getElementById('ocrOutput');
  output.innerHTML = '<div class="output-placeholder"><div style="font-size:32px">⏳</div><div>AI is reading your image...</div></div>';

  let prompt = '';
  if (mode === 'latex') {
    prompt = `You are a LaTeX OCR expert. Look at this image carefully and extract all mathematical equations and content.

Output ONLY the LaTeX code (no explanations). For each equation, use display math: $$...$$
If there are multiple equations, separate them clearly.
If there's text too, include it normally but equations must be in LaTeX.`;
  } else if (mode === 'solve') {
    prompt = `You are an expert math professor. Look at this image which contains a math problem.
1. First extract the problem in LaTeX (in $$...$$ blocks)
2. Then solve it completely with step-by-step solution
3. Show all work and provide a clear final answer
Format with markdown headings.`;
  } else {
    prompt = `You are an expert math teacher. Look at this image which contains a math problem or equation.
1. First extract all math in LaTeX format (using $$...$$ blocks)
2. Explain what this problem/equation is about
3. Explain each component step by step
4. If it's a problem, show how to approach and solve it
5. Mention any important theorems or concepts used
Format with markdown headings and clear structure.`;
  }

  try {
    const result = await GeminiAI.vision(uploadedImageBase64, uploadedImageMime, prompt);
    lastOCRLatex = result;
    output.innerHTML = formatAIResponse(result);
    renderMathInElement(output, { delimiters: [{ left: '$$', right: '$$', display: true }, { left: '$', right: '$', display: false }], throwOnError: false });

    // Extract first LaTeX block for preview
    const latexMatch = result.match(/\$\$([\s\S]+?)\$\$/);
    if (latexMatch) {
      const previewEl = document.getElementById('ocrMathPreview');
      document.getElementById('ocrLatexPreview').style.display = '';
      try { katex.render(latexMatch[1].trim(), previewEl, { displayMode: true, throwOnError: false }); } catch(e) {}
    }

    document.getElementById('copyOcrBtn').style.display = '';
    document.getElementById('loadEditorBtn').style.display = '';
    document.getElementById('exportOcrBtn').style.display = '';
    showToast('✅ Math extracted from image!');
  } catch (err) {
    output.innerHTML = `<div style="color:var(--danger);padding:16px">❌ Error: ${err.message}</div>`;
    showToast('❌ ' + err.message);
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
  const q = document.getElementById('calcExplainInput').value.trim();
  if (!q) { showToast('⚠️ Enter a question'); return; }
  const out = document.getElementById('calcExplainOutput');
  out.style.display = '';
  out.innerHTML = '<div class="output-placeholder"><div>⏳ AI is thinking...</div></div>';
  try {
    const result = await GeminiAI.text(`You are a math professor. Explain this clearly for an MSc student: "${q}". Use simple language with examples. Include LaTeX ($$...$$) where helpful.`);
    out.innerHTML = formatAIResponse(result);
    renderMathInElement(out, { delimiters: [{ left: '$$', right: '$$', display: true }, { left: '$', right: '$', display: false }], throwOnError: false });
  } catch (err) { out.innerHTML = `<div style="color:var(--danger)">❌ ${err.message}</div>`; }
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
  const subject = document.getElementById('thesisSubject').value.trim() || 'Mathematics';
  if (!input) { showToast('⚠️ Please describe your topic'); return; }

  const btn = document.getElementById('thesisBtnText');
  btn.textContent = '⏳ Generating...';

  const output = document.getElementById('thesisOutput');
  output.innerHTML = '<div class="output-placeholder"><div>⏳ AI is writing...</div></div>';

  const prompts = {
    abstract: `Write a formal academic abstract for an MSc thesis in ${subject}. Topic/Summary: "${input}". The abstract should be 250-300 words, covering: background, objectives, methodology, results, and conclusions. Use formal academic language.`,
    introduction: `Write a complete Introduction section for an MSc thesis in ${subject}. Topic: "${input}". Include: background context, problem statement, research objectives, significance, and chapter overview. Use academic language. Include relevant equations in LaTeX ($$...$$) where appropriate. Approximately 600-800 words.`,
    proof: `Write a rigorous mathematical proof for the following theorem/statement in ${subject}: "${input}". Format with: Theorem statement, Proof heading, clear logical steps, and QED. Use LaTeX ($$...$$) for all equations. Show every step clearly.`,
    conclusion: `Write a formal Conclusion section for an MSc thesis in ${subject}. Research/findings: "${input}". Include: summary of work, key contributions, limitations, and future research directions. Approximately 400-500 words. Academic language.`,
    improve: `You are an academic editor. Improve the following text for an MSc thesis in ${subject}. Make it more formal, precise, clear, and academically appropriate. Fix grammar. Preserve all mathematical content and LaTeX. Text: "${input}"`,
    references: `Generate a properly formatted bibliography/references list for an MSc thesis in ${subject}. Topics/authors mentioned: "${input}". Use APA 7th edition format. Include 8-10 relevant, real academic references.`,
  };

  try {
    const result = await GeminiAI.text(prompts[currentThesisMode]);
    lastThesisContent = result;
    output.innerHTML = formatAIResponse(result);
    renderMathInElement(output, { delimiters: [{ left: '$$', right: '$$', display: true }, { left: '$', right: '$', display: false }], throwOnError: false });
    document.getElementById('copyThesisBtn').style.display = '';
    document.getElementById('exportThesisBtn').style.display = '';
    showToast('✅ Content generated!');
  } catch (err) {
    output.innerHTML = `<div style="color:var(--danger);padding:16px">❌ ${err.message}</div>`;
    showToast('❌ ' + err.message);
  }
  btn.textContent = '📖 Generate with AI';
}

function copyThesis() { navigator.clipboard.writeText(lastThesisContent).then(() => showToast('📋 Copied!')); }
async function exportThesisWord() { await exportToDocx('Thesis Content', lastThesisContent); }

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
      <div class="wiki-article-title">📖 ${data.title}</div>
      <div class="wiki-article-summary">${data.extract}</div>
      <a class="wiki-read-more" href="${data.content_urls?.desktop?.page}" target="_blank">→ Read full article on Wikipedia</a>
      <div style="margin-top:16px">
        <button class="preset-btn" onclick="askAIAboutWiki('${data.title}','${data.extract.replace(/'/g, "\\'")}')">🤖 Ask AI to explain this deeper</button>
        <button class="preset-btn" style="margin-left:6px" onclick="askAIAboutWiki('${data.title}','Give MSc-level problems related to ${data.title}')">📝 Get practice problems</button>
      </div>
    `;
    showToast('✅ Found: ' + data.title);
  } catch (err) {
    out.innerHTML = `<div style="color:var(--danger);padding:16px">❌ ${err.message}<br><br><small>Try a different search term</small></div>`;
  }
}

function quickSearch(topic) {
  document.getElementById('wikiInput').value = topic;
  searchWiki();
}

async function askAIAboutWiki(title, context) {
  const aiOut = document.getElementById('researchAIOutput');
  aiOut.style.display = '';
  aiOut.innerHTML = '<div class="output-placeholder"><div>⏳ AI thinking...</div></div>';
  try {
    const result = await GeminiAI.text(`You are an expert mathematics professor. Based on the topic "${title}", explain this at MSc level: ${context}. Use LaTeX ($$...$$) for equations. Use markdown formatting.`);
    aiOut.innerHTML = formatAIResponse(result);
    renderMathInElement(aiOut, { delimiters: [{ left: '$$', right: '$$', display: true }, { left: '$', right: '$', display: false }], throwOnError: false });
    aiOut.scrollIntoView({ behavior: 'smooth' });
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
    const result = await GeminiAI.text(`You are an expert MSc-level mathematics research assistant. Answer this thoroughly: "${q}". Include LaTeX equations ($$...$$) and markdown formatting. Be detailed and accurate.`);
    aiOut.innerHTML = formatAIResponse(result);
    renderMathInElement(aiOut, { delimiters: [{ left: '$$', right: '$$', display: true }, { left: '$', right: '$', display: false }], throwOnError: false });
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
  return text
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h2>$1</h2>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/^\d+\. (.+)$/gm, '<div class="step-block">$&</div>')
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

// ========================
//  Toast
// ========================
let _t;
function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg; el.classList.add('show');
  clearTimeout(_t); _t = setTimeout(() => el.classList.remove('show'), 3000);
}
