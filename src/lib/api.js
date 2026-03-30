import { supabase } from './supabase.js';

/**
 * API base prefix — change this when backend migrates to /api/v1/.
 * All apiFetch calls use relative paths like "/desk/chat" which get
 * prefixed automatically, OR absolute paths starting with "/api/" which
 * pass through unchanged for backwards compatibility.
 */
export const API_PREFIX = '/api';

/**
 * Wraps fetch() and automatically attaches the Supabase Bearer token.
 *
 * Usage:
 *   apiFetch('/api/desk/chat', { method: 'POST', ... })   // absolute — passed through
 *   apiFetch('/desk/chat', { method: 'POST', ... })       // relative — prefixed with API_PREFIX
 */
export async function apiFetch(url, options = {}) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  // If the URL already starts with /api, use it as-is (backwards compat).
  // Otherwise prepend the API_PREFIX.
  const resolvedUrl = url.startsWith('/api') ? url : `${API_PREFIX}${url}`;

  return fetch(resolvedUrl, {
    ...options,
    headers: {
      ...(options.headers ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}
