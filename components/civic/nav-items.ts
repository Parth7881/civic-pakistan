import { House,Map,Plus,Files,TrendingUp,LayoutDashboard,Inbox,MapPinned,History,BarChart3,Users,UserCog } from 'lucide-react'

export type NavEntry={href:string;label:string;short?:string;Icon:typeof House}

export const citizenNav:NavEntry[]=[
 {href:'/home',label:'Home',Icon:House},
 {href:'/explore',label:'Explore Map',short:'Explore',Icon:Map},
 {href:'/report',label:'Report Issue',short:'Report',Icon:Plus},
 {href:'/my-reports',label:'My Reports',short:'Reports',Icon:Files},
 {href:'/impact',label:'Impact',Icon:TrendingUp},
]

// Platform Admin provisioning stays on its protected /admin route and is deliberately absent
// from the Government Portal navigation: ordinary officers never provision accounts.
export const governmentNav:NavEntry[]=[
 {href:'/government',label:'Overview',Icon:LayoutDashboard},
 {href:'/government/reports',label:'Reports',Icon:Inbox},
 {href:'/government/map',label:'Live Map',short:'Map',Icon:MapPinned},
 {href:'/government/history',label:'History',Icon:History},
 {href:'/government/performance',label:'Performance',short:'Metrics',Icon:BarChart3},
]

const OTHER_TITLES:NavEntry[]=[
 {href:'/admin/government-users',label:'Government Users',Icon:Users},
 {href:'/account',label:'Profile',Icon:UserCog},
]

// Deepest match wins so /government/reports/<id> highlights Reports, not Overview.
export function activeHref(entries:NavEntry[],path:string){
 let best=''
 for(const entry of entries)if((path===entry.href||path.startsWith(entry.href+'/'))&&entry.href.length>best.length)best=entry.href
 return best
}

export function pageTitle(path:string){
 const all=[...citizenNav,...governmentNav,...OTHER_TITLES]
 const href=activeHref(all,path)
 if(href)return all.find(entry=>entry.href===href)!.label
 if(path.startsWith('/incidents/'))return 'Report'
 if(path==='/jurisdiction')return 'Active city'
 return 'CivicPakistan'
}
