export function supabaseConfigurationError(): string | null {
  const value=process.env.NEXT_PUBLIC_SUPABASE_URL
  const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if(!value || !key || key.startsWith('your_')) return 'Supabase connection settings are missing. Ask the operator to configure the project API URL and public key.'
  try {
    const url=new URL(value)
    if(url.hostname==='supabase.com'||url.hostname.endsWith('.supabase.com')) return 'NEXT_PUBLIC_SUPABASE_URL must be the project API URL, not a Supabase dashboard link. Copy Project URL from Supabase Connect/API settings.'
    if(url.pathname!=='/'||url.search||url.hash||url.username||url.password) return 'The Supabase project API URL must be an origin without a dashboard path, query, or credentials.'
    if(url.protocol!=='https:' && !(url.protocol==='http:'&&['localhost','127.0.0.1'].includes(url.hostname))) return 'The Supabase API URL must use HTTPS, except for local development.'
    if(key.startsWith('sb_secret_')) return 'A server key cannot be used as the public Supabase key. Configure a publishable or anon key instead.'
    return null
  } catch { return 'The Supabase project API URL is invalid.' }
}
export function supabaseConfigured() {
  return supabaseConfigurationError()===null
}
export function supabaseConfig() {
  const error=supabaseConfigurationError()
  if (error) throw new Error(error)
  return { url: process.env.NEXT_PUBLIC_SUPABASE_URL!, key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! }
}
