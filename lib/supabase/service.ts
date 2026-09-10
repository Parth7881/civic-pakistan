import 'server-only'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { supabaseConfig } from './config'
export function createSupabaseServiceClient() {
  const { url } = supabaseConfig()
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!secret || secret.startsWith('your_')) throw new Error('Evidence storage is not configured. Please contact the platform operator.')
  return createClient<Database>(url, secret, { auth: { persistSession: false, autoRefreshToken: false } })
}
