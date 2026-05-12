/**
 * MathVoice — Dashboard Application Logic
 */

document.addEventListener('DOMContentLoaded', () => {
  // Init Supabase
  const supaReady = initSupabase();

  // Nav toggle
  document.getElementById('navToggle').addEventListener('click', () => {
    document.getElementById('navLinks').classList.toggle('open');
  });

  // Auth state
  Auth.init(async (user, event) => {
    if (user) {
      document.getElementById('dashboardMain').style.display = '';
      document.getElementById('notLoggedIn').style.display = 'none';
      const profile = await DB.getProfile();
      const name = profile?.full_name || user.email?.split('@')[0] || 'User';
      document.getElementById('dashUserName').textContent = name;
      document.getElementById('userName').textContent = name;
      document.getElementById('userAvatar').textContent = name.charAt(0).toUpperCase();
      loadDashboard();
    } else {
      // If not logged in, still show dashboard with localStorage data
      document.getElementById('dashboardMain').style.display = '';
      document.getElementById('notLoggedIn').style.display = 'none';
      document.getElementById('dashUserName').textContent = 'Guest';
      document.getElementById('userName').textContent = 'Guest';
      loadDashboard();
    }
  });

  // If supabase not ready, load from localStorage
  if (!supaReady) {
    document.getElementById('dashUserName').textContent = 'Guest';
    loadDashboard();
  }
});

// ========================
//  Load Dashboard Data
// ========================
async function loadDashboard() {
  try {
    const stats = await DB.getStats();
    document.getElementById('statEquations').textContent = stats.totalEquations;
    document.getElementById('statDocuments').textContent = stats.totalDocuments;
    document.getElementById('statAssignments').textContent = stats.totalAssignments;
    document.getElementById('statPending').textContent = stats.pendingAssignments;

    await Promise.all([loadEquations(), loadDocuments(), loadAssignments()]);
  } catch (err) {
    console.error('Dashboard load error:', err);
  }
}

// ========================
//  Tab Switching
// ========================
function switchDashTab(btn) {
  document.querySelectorAll('.dash-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.dash-section').forEach(s => s.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('section' + capitalize(btn.dataset.section)).classList.add('active');
}

function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

// ========================
//  Equations
// ========================
async function loadEquations() {
  const grid = document.getElementById('equationsGrid');
  try {
    const equations = await DB.getEquations();
    if (!equations.length) {
      grid.innerHTML = '<div class="empty-state">No equations yet. <a href="index.html#editor-section" style="color:var(--accent-light)">Create one →</a></div>';
      return;
    }
    grid.innerHTML = '';
    equations.forEach(eq => {
      const card = document.createElement('div');
      card.className = 'item-card';
      card.innerHTML = `
        <div class="item-card-header">
          <div class="item-card-title">${eq.title || 'Untitled'}</div>
          <span class="item-meta-tag">${eq.category || 'general'}</span>
        </div>
        <div class="item-card-math" id="eq-${eq.id}"></div>
        <div class="item-card-meta">
          <span class="item-meta-tag">📅 ${new Date(eq.created_at).toLocaleDateString()}</span>
        </div>
        <div class="item-card-actions">
          <button class="action-btn" onclick="copyText('${escapeLatex(eq.latex)}')">📋 Copy LaTeX</button>
          <button class="action-btn" onclick="loadInEditor('${escapeLatex(eq.latex)}')">✏️ Edit</button>
          <button class="action-btn" style="color:var(--danger)" onclick="deleteEquation('${eq.id}')">🗑️ Delete</button>
        </div>
      `;
      grid.appendChild(card);
      try { katex.render(eq.latex, document.getElementById(`eq-${eq.id}`), { displayMode: true, throwOnError: false }); } catch(e) {}
    });
  } catch (err) { grid.innerHTML = `<div class="empty-state">Error: ${err.message}</div>`; }
}

// ========================
//  Documents
// ========================
async function loadDocuments() {
  const grid = document.getElementById('documentsGrid');
  try {
    const docs = await DB.getDocuments();
    if (!docs.length) {
      grid.innerHTML = '<div class="empty-state">No documents yet. Create your first one!</div>';
      return;
    }
    grid.innerHTML = '';
    docs.forEach(doc => {
      const eqCount = (doc.equations || []).length;
      const card = document.createElement('div');
      card.className = 'item-card';
      card.innerHTML = `
        <div class="item-card-header">
          <div class="item-card-title">📄 ${doc.title}</div>
        </div>
        ${doc.content ? `<div class="item-card-notes">${doc.content.substring(0, 150)}${doc.content.length > 150 ? '...' : ''}</div>` : ''}
        <div class="item-card-meta">
          <span class="item-meta-tag">📐 ${eqCount} equation${eqCount !== 1 ? 's' : ''}</span>
          <span class="item-meta-tag">📅 ${new Date(doc.updated_at || doc.created_at).toLocaleDateString()}</span>
        </div>
        <div class="item-card-actions">
          <button class="action-btn" style="color:var(--danger)" onclick="deleteDoc('${doc.id}')">🗑️ Delete</button>
        </div>
      `;
      grid.appendChild(card);
    });
  } catch (err) { grid.innerHTML = `<div class="empty-state">Error: ${err.message}</div>`; }
}

// ========================
//  Assignments
// ========================
async function loadAssignments() {
  const grid = document.getElementById('assignmentsGrid');
  try {
    const assigns = await DB.getAssignments();
    if (!assigns.length) {
      grid.innerHTML = '<div class="empty-state">No assignments yet. Create your first one!</div>';
      return;
    }
    grid.innerHTML = '';
    assigns.forEach(a => {
      const badgeClass = a.status === 'completed' ? 'badge-completed' : a.status === 'in_progress' ? 'badge-progress' : 'badge-pending';
      const dueStr = a.due_date ? new Date(a.due_date).toLocaleDateString() : 'No due date';
      const isOverdue = a.due_date && new Date(a.due_date) < new Date() && a.status !== 'completed';

      const card = document.createElement('div');
      card.className = 'item-card';
      if (isOverdue) card.style.borderColor = 'rgba(239,68,68,0.4)';
      card.innerHTML = `
        <div class="item-card-header">
          <div class="item-card-title">📝 ${a.title}</div>
          <span class="item-card-badge ${badgeClass}">${a.status}</span>
        </div>
        <div class="item-card-meta">
          <span class="item-meta-tag">📚 ${a.subject || 'Math'}</span>
          <span class="item-meta-tag" ${isOverdue ? 'style="color:var(--danger)"' : ''}>📅 ${dueStr}${isOverdue ? ' ⚠️ OVERDUE' : ''}</span>
        </div>
        ${a.notes ? `<div class="item-card-notes">${a.notes.substring(0, 120)}${a.notes.length > 120 ? '...' : ''}</div>` : ''}
        <div class="item-card-actions">
          <select class="status-select" onchange="updateAssignStatus('${a.id}', this.value)">
            <option value="pending" ${a.status === 'pending' ? 'selected' : ''}>⏳ Pending</option>
            <option value="in_progress" ${a.status === 'in_progress' ? 'selected' : ''}>🔄 In Progress</option>
            <option value="completed" ${a.status === 'completed' ? 'selected' : ''}>✅ Completed</option>
          </select>
          <button class="action-btn" style="color:var(--danger)" onclick="deleteAssign('${a.id}')">🗑️ Delete</button>
        </div>
      `;
      grid.appendChild(card);
    });
  } catch (err) { grid.innerHTML = `<div class="empty-state">Error: ${err.message}</div>`; }
}

// ========================
//  Actions
// ========================
function escapeLatex(str) {
  return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function copyText(text) {
  const decoded = text.replace(/\\\\/g, '\\').replace(/\\'/g, "'");
  navigator.clipboard.writeText(decoded).then(() => showToast('📋 Copied!')).catch(() => showToast('❌ Copy failed'));
}

function loadInEditor(latex) {
  const decoded = latex.replace(/\\\\/g, '\\').replace(/\\'/g, "'");
  window.location.href = `index.html#editor-section?latex=${encodeURIComponent(decoded)}`;
}

async function deleteEquation(id) {
  if (!confirm('Delete this equation?')) return;
  try {
    await DB.deleteEquation(id);
    showToast('🗑️ Equation deleted');
    loadDashboard();
  } catch (err) { showToast('❌ ' + err.message); }
}

async function deleteDoc(id) {
  if (!confirm('Delete this document?')) return;
  try {
    await DB.deleteDocument(id);
    showToast('🗑️ Document deleted');
    loadDashboard();
  } catch (err) { showToast('❌ ' + err.message); }
}

async function deleteAssign(id) {
  if (!confirm('Delete this assignment?')) return;
  try {
    await DB.deleteAssignment(id);
    showToast('🗑️ Assignment deleted');
    loadDashboard();
  } catch (err) { showToast('❌ ' + err.message); }
}

async function updateAssignStatus(id, status) {
  try {
    await DB.updateAssignment(id, { status });
    showToast('✅ Status updated');
    loadDashboard();
  } catch (err) { showToast('❌ ' + err.message); }
}

// ========================
//  Create Modals
// ========================
function showNewDocModal() { showModal('newDocModal'); }
function showNewAssignmentModal() { showModal('newAssignmentModal'); }

async function createDocument(e) {
  e.preventDefault();
  const title = document.getElementById('newDocTitle').value;
  const content = document.getElementById('newDocContent').value;
  try {
    await DB.saveDocument(title, content);
    hideModal('newDocModal');
    showToast('📄 Document created!');
    document.getElementById('newDocTitle').value = '';
    document.getElementById('newDocContent').value = '';
    loadDashboard();
  } catch (err) { showToast('❌ ' + err.message); }
}

async function createAssignment(e) {
  e.preventDefault();
  const title = document.getElementById('newAssignTitle').value;
  const subject = document.getElementById('newAssignSubject').value;
  const due = document.getElementById('newAssignDue').value;
  const notes = document.getElementById('newAssignNotes').value;
  try {
    await DB.saveAssignment(title, subject, due, [], notes);
    hideModal('newAssignmentModal');
    showToast('📝 Assignment created!');
    document.getElementById('newAssignTitle').value = '';
    document.getElementById('newAssignNotes').value = '';
    loadDashboard();
  } catch (err) { showToast('❌ ' + err.message); }
}

// ========================
//  User Dropdown
// ========================
function toggleUserDropdown() {
  document.getElementById('userDropdown').classList.toggle('show');
}

document.addEventListener('click', (e) => {
  if (!e.target.closest('.user-badge') && !e.target.closest('.user-dropdown')) {
    const dd = document.getElementById('userDropdown');
    if (dd) dd.classList.remove('show');
  }
});

async function handleLogout() {
  try {
    await Auth.signOut();
    window.location.href = 'index.html';
  } catch (err) { showToast('❌ ' + err.message); }
}

// ========================
//  Modals & Toast
// ========================
function showModal(id) { document.getElementById(id).classList.add('show'); }
function hideModal(id) { document.getElementById(id).classList.remove('show'); }

let toastTimeout;
function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => el.classList.remove('show'), 3000);
}
