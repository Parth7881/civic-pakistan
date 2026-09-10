export function supabaseConfigured() {
  const value=process.env.NEXT_PUBLIC_SUPABASE_URL
  if(!value) return false
  try {
    const url=new URL(value)
    return Boolean((url.protocol==='https:' || (url.protocol==='http:' && ['localhost','127.0.0.1'].includes(url.hostname))) && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.startsWith('your_'))
  } catch { return false }
}
export function supabaseConfig() {
  if (!supabaseConfigured()) throw new Error('CivicPakistan is not connected yet. Configure the Supabase environment variables.')
  return { url: process.env.NEXT_PUBLIC_SUPABASE_URL!, key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! }
}
