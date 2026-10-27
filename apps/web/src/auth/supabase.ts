import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabase: SupabaseClient | null = url && anon ? createClient(url, anon, {  }) : null;
export const supabaseEnabled = supabase !== null;

// sync token read — supabase-js getSession can stall behind navigator locks in headless browsers
export function storageKey(): string | null {
  if (!url) return null;
  return `sb-${new URL(url).hostname.split('.')[0]}-auth-token`;
}

export function getAccessToken(): string | null {
  try {
    const raw = storageKey() ? localStorage.getItem(storageKey()!) : null;
    if (!raw) return null;
    const stored = JSON.parse(raw) as { access_token?: string };
    return stored.access_token ?? null;
  } catch { return null; }
}
