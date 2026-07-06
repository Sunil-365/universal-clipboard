// Supabase Client Configuration for DropConnect
// Replace these placeholders with your actual Supabase Project credentials.
// You can find them in your Supabase dashboard under Settings -> API.

const SUPABASE_URL = 'https://your-project-id.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-public-key';

let supabaseClient;

if (typeof supabase !== 'undefined') {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} else {
    console.error("⚠️ Supabase Client SDK not loaded. Verify script order in HTML.");
}
