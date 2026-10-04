/**
 * CircuitSage AI — Supabase Client Module (Backend)
 *
 * Provides:
 * - Public anon client for token verification
 * - User-scoped client constructor ensuring RLS applies to user queries
 * - Admin service-role client strictly for administrative/seeding tasks (never exposed to frontend)
 */

const { createClient } = require('@supabase/supabase-js');
const config = require('../config/env');

const isConfigured = Boolean(
  config.supabase.url &&
  config.supabase.anonKey &&
  !config.supabase.url.includes('your-project.supabase.co') &&
  !config.supabase.anonKey.includes('placeholder')
);

// Anonymous client for token verification and public reads (e.g. knowledge_sources)
const anonClient = isConfigured
  ? createClient(config.supabase.url, config.supabase.anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    })
  : null;

// Privileged service-role client (Backend-only; never exposed to browser)
const adminClient = isConfigured && config.supabase.serviceRoleKey && !config.supabase.serviceRoleKey.includes('placeholder')
  ? createClient(config.supabase.url, config.supabase.serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    })
  : null;

/**
 * Creates a user-scoped Supabase client that forwards the caller's JWT.
 * This guarantees that Postgres Row Level Security (RLS) is enforced at the database level!
 *
 * @param {string} token - The verified Supabase access token
 * @returns {import('@supabase/supabase-js').SupabaseClient}
 */
function createUserScopedClient(token) {
  if (!isConfigured) {
    throw new Error('Supabase is not configured with live credentials.');
  }

  return createClient(config.supabase.url, config.supabase.anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

module.exports = {
  isConfigured,
  anonClient,
  adminClient,
  createUserScopedClient
};
