'use client'
import { useState } from 'react'
import { selectJurisdiction } from '@/modules/geography/actions'
import { isNavigationSignal } from '@/lib/navigation-error'
export type Area={id:string;name:string;parent_id:string|null;level_label:string|null}
export function JurisdictionForm({areas,current}:{areas:Area[];current:string|null}) {
 const [region,setRegion]=useState(areas.find(a=>a.id===current)?.parent_id||'')
 const [city,setCity]=useState(current||''),[busy,setBusy]=useState(false),[error,setError]=useState('')
 const regions=areas.filter(a=>a.level_label==='province'||a.level_label==='region')
 return <form className="form-stack" onSubmit={async event=>{event.preventDefault();setBusy(true);setError('');try{const result=await selectJurisdiction(new FormData(event.currentTarget));setError(result.error||'');setBusy(false)}catch(cause){if(isNavigationSignal(cause))return;setError('Your civic area could not be saved. Please try again.');setBusy(false)}}}>
 <label>Country<input value="Pakistan" readOnly/></label><label>Province / Region<select required value={region} onChange={event=>{setRegion(event.target.value);setCity('')}}><option value="">Choose a province or region</option>{regions.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
 <label>City / Local Civic Area<select name="jurisdiction" required value={city} disabled={!region} onChange={event=>setCity(event.target.value)}><option value="">Choose a civic area</option>{areas.filter(a=>a.parent_id===region&&a.level_label==='local').map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
 <p className="notice">Demo coverage uses approximate service-area boundaries. Reporting requires your live location inside the selected area.</p>
 {error&&<p className="error-message" role="alert">{error}</p>}<button className="primary-button" disabled={busy||!city}>{busy?'Saving…':'Save civic area'}</button></form>
}
