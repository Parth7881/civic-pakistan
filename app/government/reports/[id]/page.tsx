import Link from 'next/link'
import { notFound } from 'next/navigation'
import { z } from 'zod'
import { ArrowLeft,CalendarDays,ExternalLink,MapPin } from 'lucide-react'
import { requireGovernment,canAccessArea } from '@/modules/government/session'
import { GovernmentActions } from '@/components/government-actions'
import { Surface,StatusBadge,EvidenceScore,SectionHeader,Alert } from '@/components/ui/civic'
import { ActivityTimeline,type TimelineEvent } from '@/components/civic/activity-timeline'
import { CivicMapFrame } from '@/components/map/civic-map-frame'
import { formatDate,formatTime } from '@/lib/utils'
export const dynamic='force-dynamic'

export default async function GovernmentReportDetail({params}:{params:{id:string}}){
 if(!z.string().uuid().safeParse(params.id).success)notFound()
 const {service,user,profile,areas}=await requireGovernment()
 const {data:incident,error}=await service.from('incidents').select('*').eq('id',params.id).single()
 if(error||!incident||!canAccessArea(profile.role,areas,incident.jurisdiction_id))notFound()
 const [{data:report},{data:evidence},{data:events},{data:updates},{data:location},{data:area}]=await Promise.all([
  service.from('citizen_reports').select('*').eq('id',incident.primary_report_id).single(),
  service.from('evidence').select('*').eq('incident_id',incident.id).order('created_at'),
  service.from('incident_events').select('*').eq('incident_id',incident.id).order('created_at'),
  service.from('government_updates').select('*').eq('incident_id',incident.id).order('created_at'),
  service.rpc('government_incident_location',{p_actor:user.id,p_incident:incident.id}),
  service.from('jurisdictions').select('name').eq('id',incident.jurisdiction_id).single(),
 ])
 if(!report)notFound()
 const point=location?.[0]
 const photos:{url:string;resolution:boolean;date:string}[]=[]
 const membershipRole=profile.role==='platform_admin'?'operator':areas.find(item=>item.id===incident.jurisdiction_id)?.membershipRole
 for(const item of evidence||[]){
  const bucket=item.is_resolution_evidence?'resolution-display':'evidence-display'
  const {data}=await service.storage.from(bucket).createSignedUrl(item.storage_path_public,900)
  if(data)photos.push({url:data.signedUrl,resolution:item.is_resolution_evidence,date:item.captured_at})
 }
 const citizenPhotos=photos.filter(photo=>!photo.resolution)
 const completionPhotos=photos.filter(photo=>photo.resolution)
 const areaName=area?.name||'Assigned civic area'
 const title=incident.category||(report.urgency==='URGENT_HAZARD'?'Urgent civic hazard':'Civic maintenance')

 const timeline:TimelineEvent[]=[
  ...(events||[]).map((event):TimelineEvent=>({
   id:event.id,
   kind:event.event_type==='REJECTED'?'rejected':event.event_type==='ACCEPTED'?'accepted':event.event_type==='SUBMITTED'?'submitted':'reviewed',
   title:event.event_type.replaceAll('_',' ').toLowerCase().replace(/^./,character=>character.toUpperCase()),
   detail:`${event.actor_role.replaceAll('_',' ')}`,
   at:event.created_at,
  })),
  ...(updates||[]).map((update):TimelineEvent=>({
   id:update.id,
   kind:update.update_type==='RESOLUTION'?'resolved':'progress',
   title:update.update_type==='RESOLUTION'?'Resolution published':'Progress update',
   detail:update.body,
   at:update.created_at,
  })),
 ].sort((a,b)=>Date.parse(a.at)-Date.parse(b.at))

 return <div className="detail-page">
  <Link className="text-link" href="/government/reports"><ArrowLeft size={15}/> Report queue</Link>

  <div className="detail-header">
   <div className="detail-header-row">
    <div>
     <h1>{title}</h1>
     <div className="detail-meta">
      <span><MapPin size={13}/>{areaName}</span>
      <span><CalendarDays size={13}/>{formatDate(report.submitted_at)} · {formatTime(report.submitted_at)} PKT</span>
      <span>Case #{incident.id.slice(0,8)}</span>
      <span>Report #{report.id.slice(0,8)}</span>
     </div>
    </div>
    <StatusBadge status={report.status}/>
   </div>
  </div>

  <div className="government-review-layout">
   <div className="context-stack">
    <Surface>
     <SectionHeader title="Citizen report"><EvidenceScore score={report.evidence_quality_score} status={report.evidence_quality_status}/></SectionHeader>
     <p>{report.description||'No citizen description was provided.'}</p>
     <dl className="detail-facts">
      <div><dt>Urgency</dt><dd>{report.urgency==='URGENT_HAZARD'?'Urgent civic hazard':'Civic maintenance'}</dd></div>
      <div><dt>Location source</dt><dd>{report.location_source==='demo'?'Server-controlled demo':'Verified live GPS'}</dd></div>
      <div><dt>Workstream</dt><dd>{incident.workstream||'Not assigned'}</dd></div>
      <div><dt>SLA deadline</dt><dd>{incident.sla_deadline?formatDate(incident.sla_deadline):'Set on acceptance'}</dd></div>
     </dl>
     {report.evidence_quality_notes&&<Alert>{report.evidence_quality_notes} Advisory score only; the reviewer remains responsible.</Alert>}
     {report.rejection_reason&&<Alert tone="error"><strong>Rejection reason</strong><br/>{report.rejection_reason}</Alert>}
    </Surface>

    <Surface>
     <SectionHeader title="Citizen evidence"><span className="caption">{citizenPhotos.length} photo(s)</span></SectionHeader>
     {citizenPhotos.length
      ?<div className="evidence-grid">{citizenPhotos.map((photo,index)=><figure key={photo.url}>
        <a href={photo.url} target="_blank" rel="noreferrer"><img src={photo.url} alt={`Citizen evidence ${index+1}`} loading="lazy"/></a>
        <figcaption>Citizen capture · {formatDate(photo.date)}</figcaption>
       </figure>)}</div>
      :<p className="muted">No citizen evidence is attached to this report.</p>}
    </Surface>

    {completionPhotos.length>0&&<Surface>
     <SectionHeader title="Completion evidence"/>
     <div className="evidence-grid">{completionPhotos.map((photo,index)=><figure key={photo.url}>
      <a href={photo.url} target="_blank" rel="noreferrer"><img src={photo.url} alt={`Completion evidence ${index+1}`} loading="lazy"/></a>
      <figcaption>Completion proof · {formatDate(photo.date)}</figcaption>
     </figure>)}</div>
    </Surface>}

    <Surface>
     <SectionHeader title="Status timeline"/>
     <ActivityTimeline events={timeline} empty="No lifecycle events recorded"/>
    </Surface>
   </div>

   <aside className="context-stack">
    <Surface className="flush">
     <div className="detail-map">
      {point
       ?<CivicMapFrame
         points={[{id:incident.id,title,category:incident.category,status:report.status,area:areaName,latitude:point.latitude,longitude:point.longitude}]}
         focus={{latitude:point.latitude,longitude:point.longitude,zoom:17}} fitToPoints={false} legend={false} controls={false}
         label={`Exact reported location in ${areaName}`}/>
       :<div className="map-config-notice"><MapPin size={24} color="#8b968f"/><p>Location unavailable for this assignment.</p></div>}
     </div>
     <div style={{padding:'0 16px 16px',display:'flex',flexDirection:'column',gap:10}}>
      <h3>Exact report location</h3>
      {point?<>
       <p className="coordinate-readout">{point.latitude.toFixed(6)}, {point.longitude.toFixed(6)}</p>
       <a className="secondary-button full-button" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${point.latitude},${point.longitude}`)}`} target="_blank" rel="noreferrer">Open in Google Maps <ExternalLink size={15}/></a>
      </>:<Alert tone="error">Location unavailable for this assignment.</Alert>}
     </div>
    </Surface>
    <GovernmentActions incidentId={incident.id} status={report.status==='REJECTED'?'REJECTED':incident.status} urgency={incident.urgency} canOperate={membershipRole==='operator'}/>
   </aside>
  </div>
 </div>
}
