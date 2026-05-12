/**
 * MathVoice — Database Module
 * CRUD operations for documents, assignments, and math works
 */

const DB = (() => {

  // ========================
  //  EQUATIONS (Math Works)
  // ========================
  async function saveEquation(latex, title, category = 'general') {
    const user = Auth.getUser();
    if (!user || !supabase) return fallbackSave('equations', { latex, title, category });

    const { data, error } = await supabase
      .from('equations')
      .insert({
        user_id: user.id,
        latex,
        title: title || 'Untitled Equation',
        category,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async function getEquations() {
    const user = Auth.getUser();
    if (!user || !supabase) return fallbackLoad('equations');

    const { data, error } = await supabase
      .from('equations')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async function deleteEquation(id) {
    const user = Auth.getUser();
    if (!user || !supabase) return fallbackDelete('equations', id);

    const { error } = await supabase
      .from('equations')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;
  }

  // ========================
  //  DOCUMENTS
  // ========================
  async function saveDocument(title, content, equations = []) {
    const user = Auth.getUser();
    if (!user || !supabase) return fallbackSave('documents', { title, content, equations });

    const { data, error } = await supabase
      .from('documents')
      .insert({
        user_id: user.id,
        title: title || 'Untitled Document',
        content,
        equations: JSON.stringify(equations),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async function updateDocument(id, updates) {
    const user = Auth.getUser();
    if (!user || !supabase) return fallbackUpdate('documents', id, updates);

    if (updates.equations) updates.equations = JSON.stringify(updates.equations);

    const { data, error } = await supabase
      .from('documents')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async function getDocuments() {
    const user = Auth.getUser();
    if (!user || !supabase) return fallbackLoad('documents');

    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(d => ({
      ...d,
      equations: typeof d.equations === 'string' ? JSON.parse(d.equations) : d.equations || [],
    }));
  }

  async function deleteDocument(id) {
    const user = Auth.getUser();
    if (!user || !supabase) return fallbackDelete('documents', id);

    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;
  }

  // ========================
  //  ASSIGNMENTS
  // ========================
  async function saveAssignment(title, subject, dueDate, equations = [], notes = '') {
    const user = Auth.getUser();
    if (!user || !supabase) return fallbackSave('assignments', { title, subject, dueDate, equations, notes });

    const { data, error } = await supabase
      .from('assignments')
      .insert({
        user_id: user.id,
        title: title || 'Untitled Assignment',
        subject: subject || 'Mathematics',
        due_date: dueDate || null,
        equations: JSON.stringify(equations),
        notes,
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async function updateAssignment(id, updates) {
    const user = Auth.getUser();
    if (!user || !supabase) return fallbackUpdate('assignments', id, updates);

    if (updates.equations) updates.equations = JSON.stringify(updates.equations);

    const { data, error } = await supabase
      .from('assignments')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async function getAssignments() {
    const user = Auth.getUser();
    if (!user || !supabase) return fallbackLoad('assignments');

    const { data, error } = await supabase
      .from('assignments')
      .select('*')
      .eq('user_id', user.id)
      .order('due_date', { ascending: true });

    if (error) throw error;
    return (data || []).map(d => ({
      ...d,
      equations: typeof d.equations === 'string' ? JSON.parse(d.equations) : d.equations || [],
    }));
  }

  async function deleteAssignment(id) {
    const user = Auth.getUser();
    if (!user || !supabase) return fallbackDelete('assignments', id);

    const { error } = await supabase
      .from('assignments')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;
  }

  // ========================
  //  PROFILE
  // ========================
  async function getProfile() {
    const user = Auth.getUser();
    if (!user || !supabase) return null;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) return { full_name: user.user_metadata?.full_name || 'User', email: user.email };
    return data;
  }

  // ========================
  //  STATS
  // ========================
  async function getStats() {
    const [equations, documents, assignments] = await Promise.all([
      getEquations(),
      getDocuments(),
      getAssignments(),
    ]);

    return {
      totalEquations: equations.length,
      totalDocuments: documents.length,
      totalAssignments: assignments.length,
      pendingAssignments: assignments.filter(a => a.status === 'pending').length,
      completedAssignments: assignments.filter(a => a.status === 'completed').length,
    };
  }

  // ========================
  //  LocalStorage Fallback (when not logged in)
  // ========================
  function fallbackSave(key, item) {
    const items = JSON.parse(localStorage.getItem(`mv_${key}`) || '[]');
    const newItem = { ...item, id: Date.now().toString(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    items.unshift(newItem);
    localStorage.setItem(`mv_${key}`, JSON.stringify(items));
    return newItem;
  }

  function fallbackLoad(key) {
    return JSON.parse(localStorage.getItem(`mv_${key}`) || '[]');
  }

  function fallbackDelete(key, id) {
    const items = JSON.parse(localStorage.getItem(`mv_${key}`) || '[]');
    const filtered = items.filter(i => i.id !== id);
    localStorage.setItem(`mv_${key}`, JSON.stringify(filtered));
  }

  function fallbackUpdate(key, id, updates) {
    const items = JSON.parse(localStorage.getItem(`mv_${key}`) || '[]');
    const idx = items.findIndex(i => i.id === id);
    if (idx !== -1) {
      items[idx] = { ...items[idx], ...updates, updated_at: new Date().toISOString() };
      localStorage.setItem(`mv_${key}`, JSON.stringify(items));
      return items[idx];
    }
  }

  return {
    saveEquation, getEquations, deleteEquation,
    saveDocument, updateDocument, getDocuments, deleteDocument,
    saveAssignment, updateAssignment, getAssignments, deleteAssignment,
    getProfile, getStats,
  };
})();
