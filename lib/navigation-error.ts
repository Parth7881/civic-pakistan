// A Server Action that calls redirect() or notFound() signals it by throwing a control-flow
// error carrying a `digest`. When the action is invoked imperatively from a client handler,
// that throw surfaces as a rejected promise, so a plain `catch` treats a *successful* sign-in
// as a network failure and flashes an error while the router is still navigating.
//
// Next 15 exports `unstable_rethrow` for this; on 14.x we match the digest ourselves.
// Format: "NEXT_REDIRECT;<type>;<url>;<statusCode>;" and "NEXT_NOT_FOUND".
export function isNavigationSignal(error:unknown):boolean{
 const digest=(error as {digest?:unknown}|null)?.digest
 return typeof digest==='string'&&(digest.startsWith('NEXT_REDIRECT')||digest==='NEXT_NOT_FOUND')
}
