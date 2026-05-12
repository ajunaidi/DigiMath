/**
 * MathVoice — Authentication Module
 * Handles login, signup, logout, password reset, session management
 */

const Auth = (() => {
  let currentUser = null;
  let onAuthChangeCallback = null;

  // Listen for auth state changes
  function init(callback) {
    onAuthChangeCallback = callback;
    if (!window.supabaseClient) {
      callback(null);
      return;
    }

    window.supabaseClient.auth.onAuthStateChange((event, session) => {
      currentUser = session?.user || null;
      if (onAuthChangeCallback) onAuthChangeCallback(currentUser, event);
    });

    // Check existing session
    window.supabaseClient.auth.getSession().then(({ data: { session } }) => {
      currentUser = session?.user || null;
      if (onAuthChangeCallback) onAuthChangeCallback(currentUser, 'INITIAL');
    });
  }

  async function signUp(email, password, fullName) {
    if (!window.supabaseClient) throw new Error('Supabase not configured');

    const { data, error } = await window.supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    });

    if (error) throw error;

    // Create user profile in profiles table
    if (data.user) {
      await window.supabaseClient.from('profiles').upsert({
        id: data.user.id,
        full_name: fullName,
        email: email,
        created_at: new Date().toISOString(),
      });
    }

    return data;
  }

  async function signIn(email, password) {
    if (!window.supabaseClient) throw new Error('Supabase not configured');

    const { data, error } = await window.supabaseClient.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return data;
  }

  async function signOut() {
    if (!window.supabaseClient) return;
    const { error } = await window.supabaseClient.auth.signOut();
    if (error) throw error;
    currentUser = null;
  }

  async function resetPassword(email) {
    if (!window.supabaseClient) throw new Error('Supabase not configured');

    const { error } = await window.supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/index.html',
    });

    if (error) throw error;
  }

  function getUser() {
    return currentUser;
  }

  function isLoggedIn() {
    return currentUser !== null;
  }

  // Promise that resolves when session is checked
  async function checkSession() {
    if (currentUser) return currentUser;
    const { data: { session } } = await window.supabaseClient.auth.getSession();
    currentUser = session?.user || null;
    return currentUser;
  }

  async function requireLogin() {
    const user = await checkSession();
    if (!user) {
      window.location.href = 'index.html?login=required';
    }
    return user;
  }

  return { init, signUp, signIn, signOut, resetPassword, getUser, isLoggedIn, requireLogin, checkSession };
})();
