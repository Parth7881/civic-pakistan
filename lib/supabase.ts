// Compatibility entry point for server imports. Browser code imports ./supabase/browser.
import 'server-only'
export { createSupabaseServerClient } from './supabase/server'
export { createSupabaseServiceClient } from './supabase/service'
