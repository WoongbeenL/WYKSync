// This file creates the shared Supabase client for the frontend.
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// We keep a flag so the UI can show a clear message if env vars are missing.
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// Only create the client when both required env vars exist.
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
