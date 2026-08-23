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
    // 카카오 로그인은 브라우저를 카카오로 보냈다가 #access_token=... 을 달고
    // 돌아온다. 이걸 켜 두어야 supabase-js 가 그 조각을 주워 세션을 연다.
    //
    // 프리렌더(isServer)에서는 켜면 안 된다 — window 도 location 도 없다.
    // 네이티브(앱)에는 주소창이 없으므로 여기서 할 일이 없다. 거기서는
    // openAuthSessionAsync 가 받아 온 주소를 auth.tsx 가 직접 푼다.
    detectSessionInUrl: Platform.OS === 'web' && !isServer,
  },
});

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
