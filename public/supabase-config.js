// Supabase Client Configuration for DropConnect
// Replace these placeholders with your actual Supabase Project credentials.
// You can find them in your Supabase dashboard under Settings -> API.

const SUPABASE_URL = 'https://hxdwhihzvfbrbuhalrtc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh4d2RoaWh6dnpmcmJydWhhbHRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzMTY3NDIsImV4cCI6MjA5ODg5Mjc0Mn0._sZFbCE-eO8uQu4ylFJ8ZJ6MEGQru1BkVYUBaOh8MAc';

let supabaseClient;

if (typeof supabase !== 'undefined') {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} else {
    console.error("⚠️ Supabase Client SDK not loaded. Verify script order in HTML.");
}
