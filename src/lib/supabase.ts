import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase env vars are missing. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in .env ' +
      '(see .env.example). Auth, sync, and community features will not work until this is configured.'
  );
}

// expo-router's web output pre-renders screens in a plain Node.js process that
// emulates just enough of the RN/web globals (e.g. `navigator`) to run app
// code, but not `window` — and AsyncStorage's web implementation touches
// `window` directly. Only the web platform is ever pre-rendered like this, so
// "web platform + no window" reliably means "Node SSR pass, not a real
// browser". Fall back to a no-op storage there; native (no `window` ever) is
// unaffected since Platform.OS is never 'web' there.
const isServer = Platform.OS === 'web' && typeof window === 'undefined';
const noopStorage = {
  getItem: async () => null,
  setItem: async () => {},
  removeItem: async () => {},
};

export const supabase = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '', {
  auth: {
    storage: isServer ? noopStorage : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
