import 'server-only'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'
import { supabaseConfig } from './config'
export function createSupabaseServerClient() {
  const store = cookies()
  const { url, key } = supabaseConfig()
  return createServerClient<Database>(url, key, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: values => {
        try { values.forEach(({ name, value, options }) => store.set(name, value, options)) }
        catch { /* Server Components cannot set cookies; middleware refreshes them. */ }
      },
    },
  })
}
