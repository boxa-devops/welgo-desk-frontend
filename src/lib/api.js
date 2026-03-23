import { supabase } from './supabase.js';

/**
 * Wraps fetch() and automatically attaches the Supabase Bearer token.
 * Usage: apiFetch('/api/desk/chat', { method: 'POST', ... })
 */
export async function apiFetch(url, options = {}) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  return fetch(url, {
    ...options,
    headers: {
      ...(options.headers ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}
