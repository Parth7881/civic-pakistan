'use client'
import { useMemo,useState } from 'react'
import { ReportTable,type ReportRow } from './report-table'

const TABS=[
 {key:'ALL',label:'All',match:()=>true},
 {key:'UNDER_REVIEW',label:'Under review',match:(status:string)=>['SUBMITTED','UNDER_REVIEW','FLAGGED_FOR_REREVIEW'].includes(status)},
 {key:'ACCEPTED',label:'Accepted',match:(status:string)=>status==='ACCEPTED'},
 {key:'IN_PROGRESS',label:'In progress',match:(status:string)=>status==='IN_PROGRESS'},
 {key:'RESOLVED',label:'Resolved',match:(status:string)=>['RESOLVED','VERIFIED_RESOLVED'].includes(status)},
 {key:'REJECTED',label:'Rejected',match:(status:string)=>status==='REJECTED'},
]

export function MyReportsView({rows}:{rows:ReportRow[]}){
 const [tab,setTab]=useState('ALL')
 const counts=useMemo(()=>Object.fromEntries(TABS.map(entry=>[entry.key,rows.filter(row=>entry.match(row.status)).length])),[rows])
 const visible=useMemo(()=>rows.filter(row=>(TABS.find(entry=>entry.key===tab)||TABS[0]).match(row.status)),[rows,tab])
 return <>
  <div className="segmented" role="tablist" aria-label="Filter my reports">
   {TABS.map(entry=><button key={entry.key} role="tab" type="button" aria-selected={tab===entry.key} onClick={()=>setTab(entry.key)}>{entry.label}<b>{counts[entry.key]}</b></button>)}
  </div>
  <ReportTable rows={visible} empty={{title:tab==='ALL'?'Your first report starts a record':'Nothing in this view',description:tab==='ALL'?'Report a civic problem with verified location and evidence to begin.':'Reports move between these views as government review progresses.'}}/>
 </>
}
