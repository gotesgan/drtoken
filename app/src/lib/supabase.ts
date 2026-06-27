import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Supabase client for general-purpose database operations.
 * Works on both client and server (but does NOT manage auth cookies for SSR).
 * For SSR-aware clients, use `@/lib/auth` (server) or `createBrowserClient` (browser).
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
