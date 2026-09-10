import Link from 'next/link'
import { notFound } from 'next/navigation'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseServiceClient } from '@/lib/supabase/service'
import { supabaseConfigured } from '@/lib/supabase/config'
import { publicIncidents,statusLabel } from '@/modules/incidents/queries'
import { formatDate,formatTime } from '@/lib/utils'
export const dynamic='force-dynamic'
export default async function IncidentDetail({params,searchParams}:{params:{id:string};searchParams:{submitted?:string}}){
 if(!z.string().uuid().safeParse(params.id).success)notFound()
 if(!supabaseConfigured()) return <p className="notice">Incident information is not connected yet.</p>
 const db=createSupabaseServerClient()
 const {data:{user}}=await db.auth.getUser()
 const {data:owned,error}=user?await db.from('incidents').select('*').eq('id',params.id).maybeSingle():{data:null,error:null}
 if(error)throw new Error('Incident data is unavailable.')
 const publicResult=owned?null:await publicIncidents()
 if(publicResult?.error)throw new Error('Public incident data is unavailable.')
 const incident=owned||publicResult?.incidents.find(i=>i.id===params.id)
 if(!incident)notFound()
 const {data:area}=await db.from('jurisdictions').select('name').eq('id',incident.jurisdiction_id).single()
 const {data:report}=owned?await db.from('citizen_reports').select('id,description,submitted_at').eq('id',owned.primary_report_id).single():{data:null}
 const images:{url:string;date:string}[]=[]
 let evidenceUnavailable=false
 try {
  // Public access is gated by the sanitized public RPC above; ownership by RLS above.
  const service=createSupabaseServiceClient()
  const {data:evidence,error:mediaError}=await service.from('evidence').select('storage_path_public,captured_at').eq('incident_id',incident.id)
  if(mediaError)throw new Error('Evidence unavailable')
  for(const image of evidence||[]) {
   const {data,error}=await service.storage.from('evidence-display').createSignedUrl(image.storage_path_public,900)
   if(error)evidenceUnavailable=true
   else if(data)images.push({url:data.signedUrl,date:image.captured_at})
  }
 }catch{evidenceUnavailable=true}
 return <><Link className="text-link" href={owned?'/my-reports':'/explore'}>← {owned?'My reports':'Explore'}</Link>{searchParams.submitted==='1'&&owned&&<p className="success-message" role="status">Report recorded. Keep this incident ID to follow your report.</p>}<p className="eyebrow detail-eyebrow">{area?.name||'Civic incident'} · {formatDate(incident.created_at)}</p><h1>{incident.urgency==='URGENT_HAZARD'?'Urgent Civic Hazard':'Civic Maintenance'}</h1><p className="status-badge">{statusLabel(incident.status)}</p><p className="lede">{report?.description||incident.category||'Citizen evidence for a local civic issue.'}</p><dl className="detail-facts"><div><dt>Incident ID</dt><dd>{incident.id}</dd></div>{report&&<div><dt>Report ID</dt><dd>{report.id}</dd></div>}<div><dt>Visibility</dt><dd>{owned&&!owned.is_public?'Private · awaiting government review':'Public'}</dd></div></dl>{incident.status==='SUBMITTED'&&<p className="notice">Your report has been saved with its evidence. Government review is not available in this Part 1 release. No acceptance or resolution has been recorded.</p>}<h2>Evidence</h2>{evidenceUnavailable&&<p className="notice">Some evidence could not be loaded. Please refresh to renew access.</p>}<div className="evidence-grid">{images.map((image,i)=><figure key={image.url}><img src={image.url} alt={`Civic issue evidence ${i+1}`}/><figcaption>Captured {formatDate(image.date)} at {formatTime(image.date)} PKT</figcaption></figure>)}</div>{!images.length&&!evidenceUnavailable&&<p className="muted">No evidence available.</p>}</>
}
