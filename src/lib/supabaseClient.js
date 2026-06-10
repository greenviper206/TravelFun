import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const hasValidSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);

const globalForSupabase = globalThis;

const url = supabaseUrl || 'https://gwalvixkkjmlxeqfqncm.supabase.co';
const key = supabaseAnonKey || 'sb_publishable_k3070NTq31Ppb_RX_QFWRw_kKPYhg5X';

export const supabase = globalForSupabase.supabase || createClient(url, key);

if (process.env.NODE_ENV !== 'production') {
  globalForSupabase.supabase = supabase;
}