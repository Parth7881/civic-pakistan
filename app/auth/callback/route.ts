import { NextRequest,NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logAuthFailure } from '@/modules/auth/errors'
export async function GET(request:NextRequest) {
 const code=request.nextUrl.searchParams.get('code')
 if(code) {
  try { const {data,error}=await createSupabaseServerClient({writableCookies:true}).auth.exchangeCodeForSession(code)
   if(!error) return NextResponse.redirect(new URL('redirectType' in data && data.redirectType==='recovery'?'/reset-password':'/home',request.url))
   logAuthFailure('callback',error)
  } catch { /* Show a retry path without exposing provider details. */ }
 }
 return NextResponse.redirect(new URL('/sign-in?confirmation=failed',request.url))
}
