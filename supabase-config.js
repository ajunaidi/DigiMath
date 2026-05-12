/**
 * MathVoice — Supabase Configuration
 * 
 * HOW TO SET UP:
 * 1. Go to https://supabase.com and create a FREE account
 * 2. Create a new project
 * 3. Go to Settings → API
 * 4. Copy your "Project URL" and "anon/public" key
 * 5. Paste them below
 */

const SUPABASE_URL = 'https://szguohhonbrkjnnmlgbc.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_UwBhwk3ezO0wtlCWvSQGZA_cEppKwRJ';

// Initialize Supabase client
window.supabaseClient = null;

function initSupabase() {
  if (SUPABASE_URL === 'YOUR_SUPABASE_URL_HERE' || SUPABASE_ANON_KEY === 'YOUR_SUPABASE_ANON_KEY_HERE') {
    console.warn('⚠️ Supabase not configured. Please update supabase-config.js with your credentials.');
    return false;
  }
  
  try {
    const { createClient } = window.supabase;
    window.supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('✅ Supabase initialized successfully');
    return true;
  } catch (err) {
    console.error('❌ Supabase init failed:', err);
    return false;
  }
}
