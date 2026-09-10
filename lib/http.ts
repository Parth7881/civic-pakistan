import { NextRequest,NextResponse } from 'next/server'
import { ZodError } from 'zod'
export function assertSameOrigin(request:NextRequest) {
 const origin=request.headers.get('origin')
 let valid=false
 try {
  const parsed=new URL(origin||'')
  // NextURL normalizes loopback addresses; Host preserves the actual browser origin.
  valid=parsed.host===request.headers.get('host') && parsed.protocol===request.nextUrl.protocol && ['http:','https:'].includes(parsed.protocol)
 }catch{valid=false}
 if(!valid) throw new Error('Invalid request origin. Refresh the page and try again.')
}
export function failure(error:unknown,status=400) {
 const message=error instanceof ZodError ? 'Check the required fields, GPS accuracy, and description length.' : error instanceof Error ? error.message : 'The request could not be completed. Please try again.'
 return NextResponse.json({error:message},{status})
}
