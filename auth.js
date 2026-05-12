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
    if (!supabase) {
      callback(null);
      return;
    }

    supabase.auth.onAuthStateChange((event, session) => {
      currentUser = session?.user || null;
      if (onAuthChangeCallback) onAuthChangeCallback(currentUser, event);
    });

    // Check existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      currentUser = session?.user || null;
      if (onAuthChangeCallback) onAuthChangeCallback(currentUser, 'INITIAL');
    });
  }

  async function signUp(email, password, fullName) {
    if (!supabase) throw new Error('Supabase not configured');

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    });

    if (error) throw error;

    // Create user profile in profiles table
    if (data.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        full_name: fullName,
        email: email,
        created_at: new Date().toISOString(),
      });
    }

    return data;
  }

  async function signIn(email, password) {
    if (!supabase) throw new Error('Supabase not configured');

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return data;
  }

  async function signOut() {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    currentUser = null;
  }

  async function resetPassword(email) {
    if (!supabase) throw new Error('Supabase not configured');

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
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

  return { init, signUp, signIn, signOut, resetPassword, getUser, isLoggedIn };
})();
