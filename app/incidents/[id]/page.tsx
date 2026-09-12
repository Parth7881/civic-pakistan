import Link from 'next/link'
import { notFound } from 'next/navigation'
import { z } from 'zod'
import { ArrowLeft,CalendarDays,LockKeyhole,MapPin } from 'lucide-react'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseServiceClient } from '@/lib/supabase/service'
import { supabaseConfigured } from '@/lib/supabase/config'
import { publicIncidents } from '@/modules/incidents/queries'
import { formatDate,formatTime } from '@/lib/utils'
import { Surface,StatusBadge,Alert,SectionHeader,EvidenceScore } from '@/components/ui/civic'
import { ActivityTimeline,type TimelineEvent } from '@/components/civic/activity-timeline'
import { CivicMapFrame } from '@/components/map/civic-map-frame'
export const dynamic='force-dynamic'

export default async function IncidentDetail({params,searchParams}:{params:{id:string};searchParams:{submitted?:string}}){
 if(!z.string().uuid().safeParse(params.id).success)notFound()
 if(!supabaseConfigured())return <Alert>Incident information is not connected yet.</Alert>
 const db=createSupabaseServerClient(),{data:{user}}=await db.auth.getUser()
 const {data:owned,error}=user?await db.from('incidents').select('*').eq('id',params.id).maybeSingle():{data:null,error:null}
 if(error)throw new Error('Incident data is unavailable.')
 const publicResult=owned?null:await publicIncidents();if(publicResult?.error)throw new Error('Public incident data is unavailable.')
 const publicRecord=publicResult?.incidents.find(item=>item.id===params.id)
 const incident=owned||publicRecord;if(!incident)notFound()
 const service=createSupabaseServiceClient(),{data:record}=owned?{data:owned}:await service.from('incidents').select('*').eq('id',incident.id).single()
 if(!record)notFound()
 const [{data:area},{data:report},{data:evidence},{data:updates},{data:events}]=await Promise.all([
  db.from('jurisdictions').select('name').eq('id',incident.jurisdiction_id).single(),
  owned?db.from('citizen_reports').select('*').eq('id',owned.primary_report_id).single():service.from('citizen_reports').select('id,description,submitted_at,status,evidence_quality_score,evidence_quality_status,evidence_quality_notes,rejection_reason').eq('id',record.primary_report_id).single(),
  service.from('evidence').select('storage_path_public,captured_at,is_resolution_evidence').eq('incident_id',incident.id).order('created_at'),
  service.from('government_updates').select('id,body,update_type,created_at').eq('incident_id',incident.id).order('created_at'),
  service.from('incident_events').select('id,event_type,created_at,payload').eq('incident_id',incident.id).order('created_at'),
 ])
 const images:{url:string;date:string;resolution:boolean}[]=[];let evidenceUnavailable=false
 try{for(const item of evidence||[]){const bucket=item.is_resolution_evidence?'resolution-display':'evidence-display',{data,error:mediaError}=await service.storage.from(bucket).createSignedUrl(item.storage_path_public,900);if(mediaError)evidenceUnavailable=true;else if(data)images.push({url:data.signedUrl,date:item.captured_at,resolution:item.is_resolution_evidence})}}catch{evidenceUnavailable=true}

 const displayStatus=report?.status||incident.status
 const citizenPhotos=images.filter(image=>!image.resolution)
 const resolutionPhotos=images.filter(image=>image.resolution)
 const title=record.category||(incident.urgency==='URGENT_HAZARD'?'Urgent civic hazard':'Civic maintenance')
 const areaName=area?.name||'Local civic area'

 const timeline:TimelineEvent[]=([
  {id:'submitted',kind:'submitted' as const,title:'Citizen report recorded',detail:null,at:incident.created_at},
  ...(events||[]).filter(event=>['ACCEPTED','REJECTED'].includes(event.event_type)).map((event):TimelineEvent=>({
   id:event.id,
   kind:(event.event_type==='ACCEPTED'?'accepted':'rejected') as TimelineEvent['kind'],
   title:event.event_type==='ACCEPTED'?'Accepted for action':'Government review completed',
   detail:null,at:event.created_at,
  })),
  ...(updates||[]).map((update):TimelineEvent=>({
   id:update.id,
   kind:(update.update_type==='RESOLUTION'?'resolved':'progress') as TimelineEvent['kind'],
   title:update.update_type==='RESOLUTION'?'Resolution published':'Government progress update',
   detail:update.body,at:update.created_at,
  })),
 ] satisfies TimelineEvent[]).sort((a,b)=>Date.parse(a.at)-Date.parse(b.at))

 // Public map points are already rounded by list_public_incidents; owned records only
 // show a location when the platform already publishes it.
 const mapPoint=publicRecord?[{id:incident.id,title,category:record.category,status:displayStatus,area:areaName,latitude:publicRecord.latitude,longitude:publicRecord.longitude}]:[]

 return <div className="detail-page">
  <Link className="text-link" href={owned?'/my-reports':'/explore'}><ArrowLeft size={15}/> {owned?'My reports':'Explore'}</Link>
  {searchParams.submitted==='1'&&owned&&<Alert tone="success">Report recorded. Your evidence is saved and linked to this case.</Alert>}

  <div className="detail-header">
   <div className="detail-header-row">
    <div>
     <h1>{title}</h1>
     <div className="detail-meta">
      <span><MapPin size={13}/>{areaName}</span>
      <span><CalendarDays size={13}/>{formatDate(incident.created_at)} · {formatTime(incident.created_at)} PKT</span>
      <span>Case #{incident.id.slice(0,8)}</span>
      {report&&<span>Report #{report.id.slice(0,8)}</span>}
     </div>
    </div>
    <StatusBadge status={displayStatus}/>
   </div>
  </div>

  <div className="detail-layout">
   <div className="context-stack">
    <Surface>
     <SectionHeader title="Citizen evidence"><EvidenceScore score={report?.evidence_quality_score} status={report?.evidence_quality_status}/></SectionHeader>
     {report?.description&&<p>{report.description}</p>}
     {evidenceUnavailable&&<Alert>Some evidence could not be loaded. Refresh to renew access.</Alert>}
     {citizenPhotos.length
      ?<div className="evidence-grid">{citizenPhotos.map((image,index)=><figure key={image.url}>
        <a href={image.url} target="_blank" rel="noreferrer" aria-label={`Open evidence photo ${index+1}`}><img src={image.url} alt={`Civic issue evidence ${index+1}`} loading="lazy"/></a>
        <figcaption>Citizen capture · {formatDate(image.date)}</figcaption>
       </figure>)}</div>
      :!evidenceUnavailable&&<p className="muted">No public evidence available for this case.</p>}
     {report?.evidence_quality_notes&&<Alert>{report.evidence_quality_notes} Advisory evidence score only.</Alert>}
     {report?.rejection_reason&&owned&&<Alert tone="error"><strong>Government reason</strong><br/>{report.rejection_reason}</Alert>}
     {owned?.is_demo&&<Alert tone="warning">Demo location. This case uses a server-selected demo point and stays private.</Alert>}
    </Surface>

    {resolutionPhotos.length>0&&<Surface>
     <SectionHeader title="Before and after"/>
     <div className="compare-grid">
      <figure className="before"><span>Before</span>{citizenPhotos[0]?<img src={citizenPhotos[0].url} alt="Reported condition" loading="lazy"/>:<p className="muted">No citizen photo available.</p>}</figure>
      <figure className="after"><span>After</span><img src={resolutionPhotos[0].url} alt="Completed work" loading="lazy"/></figure>
     </div>
     {resolutionPhotos.length>1&&<div className="evidence-grid">{resolutionPhotos.slice(1).map((image,index)=><figure key={image.url}>
      <a href={image.url} target="_blank" rel="noreferrer"><img src={image.url} alt={`Completion evidence ${index+2}`} loading="lazy"/></a>
      <figcaption>Completion proof · {formatDate(image.date)}</figcaption>
     </figure>)}</div>}
     {updates?.filter(update=>update.update_type==='RESOLUTION').map(update=><p key={update.id} className="muted">{update.body}</p>)}
    </Surface>}

    <Surface>
     <SectionHeader title="Case timeline"/>
     <ActivityTimeline events={timeline}/>
    </Surface>
   </div>

   <aside className="detail-side">
    <Surface className="flush">
     <div className="detail-map">
      {mapPoint.length
       ?<CivicMapFrame points={mapPoint} fitToPoints focus={{latitude:mapPoint[0].latitude,longitude:mapPoint[0].longitude,zoom:14}} legend={false} controls={false} label={`Approximate location in ${areaName}`}/>
       :<div className="map-config-notice"><MapPin size={24} color="#8b968f"/><p>Exact citizen coordinates stay private until a case is published publicly.</p></div>}
     </div>
     <div style={{padding:'0 16px 16px',display:'flex',flexDirection:'column',gap:10}}>
      <dl className="detail-facts">
       <div><dt>Civic area</dt><dd>{areaName}</dd></div>
       <div><dt>Category</dt><dd>{record.category||'Awaiting classification'}</dd></div>
       <div><dt>Workstream</dt><dd>{record.workstream||'Not assigned'}</dd></div>
       <div><dt>Visibility</dt><dd>{owned&&!owned.is_public?'Private':'Public'}</dd></div>
      </dl>
      <p className="caption">Public map locations are rounded. Exact coordinates remain protected from public display.</p>
     </div>
    </Surface>
    <Surface>
     <span className="icon-tile"><LockKeyhole size={20}/></span>
     <h3>Evidence privacy</h3>
     <p className="muted">Original photos remain private. Display photos use temporary access links that expire.</p>
    </Surface>
   </aside>
  </div>
 </div>
}
