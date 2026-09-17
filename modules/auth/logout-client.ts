'use client'

type AuthClient={auth:{signOut:(options?:{scope?:'global'|'local'|'others'})=>Promise<{error:unknown|null}>}}
type RouterLike={replace:(href:string)=>void;refresh:()=>void}

export async function performLogout(client:AuthClient,router:RouterLike,redirectTo:string){
 const {error}=await client.auth.signOut({scope:'local'})
 if(error)throw new Error('Unable to sign out. Please try again.')
 router.replace(redirectTo)
 router.refresh()
}
