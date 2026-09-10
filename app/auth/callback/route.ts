import { NextRequest,NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
export async function GET(request:NextRequest) {
 const code=request.nextUrl.searchParams.get('code')
 if(code) {
  try { const {error}=await createSupabaseServerClient().auth.exchangeCodeForSession(code)
   if(!error) return NextResponse.redirect(new URL(request.nextUrl.searchParams.get('next')==='reset-password'?'/reset-password':'/home',request.url))
  } catch { /* Show a retry path without exposing provider details. */ }
 }
 return NextResponse.redirect(new URL('/sign-in?confirmation=failed',request.url))
}
