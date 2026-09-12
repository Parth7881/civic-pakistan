'use client'
import { useEffect,useRef,useState } from 'react'
import { useRouter } from 'next/navigation'
import { Camera,MapPin,Check,RotateCcw,TriangleAlert,Wrench,ShieldCheck,LockKeyhole,Navigation,LoaderCircle,X,Upload,Trash2,ArrowRight } from 'lucide-react'
import { getLiveLocation } from '@/modules/reports/location'
import { cameraError } from '@/modules/reports/camera'
import { REPORTING_POLICY,accuracyQuality,type LocationPolicy } from '@/modules/reports/policy'
import type { LiveLocation } from '@/modules/reports/validation'
import { StepCard,Alert,Surface,ReportingAreaBanner } from '@/components/ui/civic'
import { CivicMapFrame } from '@/components/map/civic-map-frame'
type Photo={url:string;blob:Blob;capturedAt:number;uploadId:string;state:'Ready to upload'|'Uploading'|'Uploaded'|'Upload failed';error?:string}
type Capture={sessionId:string;expiresAt:number;source:'live'|'demo';location:LiveLocation}
async function requestJson(url:string,init:RequestInit) {
 const response=await fetch(url,init)
 let result
 try{result=await response.json()}catch{throw new Error('The service could not receive this request. Check your connection and retry.')}
 if(!response.ok)throw new Error(result.error||'The request failed. Please retry.')
 return result
}
export function ReportForm({area,policy,demoEnabled=false,aiEnabled=false}:{area:string;policy:LocationPolicy;demoEnabled?:boolean;aiEnabled?:boolean}) {
 const router=useRouter(),video=useRef<HTMLVideoElement>(null),stream=useRef<MediaStream|null>(null),mounted=useRef(true),geoAbort=useRef<AbortController|null>(null),cameraGeneration=useRef(0)
 const [session,setSession]=useState<Capture|null>(null),[best,setBest]=useState<LiveLocation|null>(null),[photos,setPhotos]=useState<Photo[]>([]),[preview,setPreview]=useState<Photo|null>(null)
 const [camera,setCamera]=useState(false),[cameraReady,setCameraReady]=useState(false),[urgency,setUrgency]=useState(''),[description,setDescription]=useState(''),[busy,setBusy]=useState(''),[now,setNow]=useState(Date.now()),[step,setStep]=useState(1)
 const [errors,setErrors]=useState({location:'',camera:'',submit:''})
 const searching=busy==='location',uploading=photos.some(p=>p.state==='Uploading'),valid=!!session&&now<session.expiresAt
 const allUploaded=photos.length>0&&photos.every(p=>p.state==='Uploaded')
 const unlocked=!urgency?1:!valid?2:!allUploaded?3:4
 function setError(key:keyof typeof errors,value:string){setErrors(current=>({...current,[key]:value}))}
 function stopCamera(){cameraGeneration.current++;stream.current?.getTracks().forEach(t=>t.stop());stream.current=null;setCamera(false);setCameraReady(false)}
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;geoAbort.current?.abort();cameraGeneration.current++;stream.current?.getTracks().forEach(t=>t.stop())}},[])
 useEffect(()=>{if(!session)return;const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer)},[session])
 useEffect(()=>{if(session&&!valid&&camera)stopCamera()},[valid,camera,session])
 useEffect(()=>{if(step>unlocked)setStep(unlocked)},[step,unlocked])
 useEffect(()=>{if(!camera||!video.current)return;video.current.srcObject=stream.current;void video.current.play().catch(()=>setError('camera','The camera preview could not start. Close the camera and retry.'));const timer=setTimeout(()=>{if(video.current&&video.current.readyState<2){stopCamera();setError('camera','The camera did not initialize. Close other camera apps and retry.')}},10000);return()=>clearTimeout(timer)},[camera])
 async function locate(mode:'live'|'demo'){
  if(photos.length&&!window.confirm('Starting a new camera session clears these photos. Continue?'))return
  geoAbort.current?.abort();const controller=new AbortController();geoAbort.current=controller
  setBusy('location');setError('location','');setBest(null);stopCamera()
  try{
   const location=mode==='live'?await getLiveLocation({policy,onProgress:setBest,signal:controller.signal}):null
   const capture:Capture=await requestJson('/api/capture',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(mode==='demo'?{mode:'demo'}:location),signal:controller.signal})
   if(!mounted.current)return
   setSession(capture);setBest(mode==='demo'?null:capture.location);setPhotos([]);setPreview(null);setNow(Date.now());setErrors({location:'',camera:'',submit:''});setStep(3)
  }catch(e){if(mounted.current)setError('location',controller.signal.aborted?'Location search cancelled. You can try again when ready.':e instanceof Error?e.message:'Location could not be verified.')}
  finally{if(mounted.current)setBusy('')}
 }
 async function openCamera(){
  setError('camera','');setBusy('camera');setCameraReady(false)
  const generation=++cameraGeneration.current
  try{
   if(!window.isSecureContext)throw new Error('Camera access requires HTTPS or localhost. Open the secure application address.')
   if(!navigator.mediaDevices?.getUserMedia)throw new Error('This browser does not support camera capture. Try a current browser on your phone or computer.')
   if(!session||Date.now()>session.expiresAt)throw new Error('Verify your location to start a new camera session.')
   let requested=navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1600},height:{ideal:1200}},audio:false}).catch(e=>{if(e instanceof DOMException&&e.name==='OverconstrainedError')return navigator.mediaDevices.getUserMedia({video:true,audio:false});throw e})
   requested=requested.then(next=>{if(!mounted.current||generation!==cameraGeneration.current){next.getTracks().forEach(t=>t.stop());throw new Error('Camera request cancelled.')}return next})
   let timer:ReturnType<typeof setTimeout>|undefined
   const next=await Promise.race([requested,new Promise<never>((_,reject)=>{timer=setTimeout(()=>{cameraGeneration.current++;reject(new Error('Camera permission is still pending. Allow access in the browser, then retry.'))},20000)})]).finally(()=>clearTimeout(timer))
   stream.current=next;setCamera(true)
  }catch(e){if(mounted.current)setError('camera',cameraError(e))}finally{if(mounted.current)setBusy('')}
 }
 async function capturePhoto(){
  if(!video.current?.videoWidth||!session||!cameraReady)return
  setBusy('capture');setError('camera','')
  try{
   const canvas=document.createElement('canvas'),ratio=Math.min(1,1600/video.current.videoWidth,1600/video.current.videoHeight)
   canvas.width=Math.round(video.current.videoWidth*ratio);canvas.height=Math.round(video.current.videoHeight*ratio)
   const context=canvas.getContext('2d');if(!context)throw new Error('Your browser could not prepare the photo. Try again.')
   context.drawImage(video.current,0,0,canvas.width,canvas.height)
   const capturedAt=Date.now(),piexif=(await import('piexifjs')).default,location=session.location
   const dms=(value:number)=>{const n=Math.abs(Number(value.toFixed(5))),d=Math.floor(n),m=Math.floor((n-d)*60);return [[d,1],[m,1],[Math.round(((n-d)*60-m)*600000),10000]]}
   const time=new Date(capturedAt).toISOString().slice(0,19).replace(/-/g,':').replace('T',' ')
   const exif=piexif.dump({'0th':{306:time,270:session.source==='demo'?'Demo location; not live GPS':'Live camera evidence'},Exif:{36867:time},...(session.source==='live'?{GPS:{1:location.latitude<0?'S':'N',2:dms(location.latitude),3:location.longitude<0?'W':'E',4:dms(location.longitude)}}:{})})
   const url=piexif.insert(exif,canvas.toDataURL('image/jpeg',0.8)),blob=await(await fetch(url)).blob()
   if(blob.size>REPORTING_POLICY.maxPhotoBytes)throw new Error('Photo is larger than 2 MB. Please retake with a simpler frame.')
   setPreview({url,blob,capturedAt,uploadId:crypto.randomUUID(),state:'Ready to upload'});stopCamera()
  }catch(e){setError('camera',cameraError(e))}finally{setBusy('')}
 }
 async function uploadPhoto(photo:Photo){
  if(!session)return
  setPhotos(current=>current.map(p=>p.uploadId===photo.uploadId?{...p,state:'Uploading',error:undefined}:p))
  try{
   const form=new FormData();form.set('sessionId',session.sessionId);form.set('uploadId',photo.uploadId);form.set('capturedAt',String(photo.capturedAt));form.set('photo',photo.blob,'capture.jpg')
   const result=await requestJson('/api/evidence',{method:'POST',body:form})
   if(result.uploadId!==photo.uploadId)throw new Error('The photo was not confirmed. Please retry.')
   if(mounted.current)setPhotos(current=>current.map(p=>p.uploadId===photo.uploadId?{...p,state:'Uploaded',error:undefined}:p))
  }catch(e){if(mounted.current)setPhotos(current=>current.map(p=>p.uploadId===photo.uploadId?{...p,state:'Upload failed',error:e instanceof Error?e.message:'Upload failed. Retry your connection.'}:p))}
 }
 function usePhoto(){if(!preview)return;const photo=preview;setPhotos(current=>[...current,photo]);setPreview(null);void uploadPhoto(photo)}
 async function submit(){
  if(!session||!allUploaded||!urgency||!valid)return
  setBusy('submit');setError('submit','');stopCamera()
  try{
   const controller=new AbortController();geoAbort.current=controller
   const location=session.source==='demo'?undefined:await getLiveLocation({policy,onProgress:setBest,signal:controller.signal})
   const result=await requestJson('/api/reports',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:session.sessionId,urgency,description,location,uploadIds:photos.map(p=>p.uploadId)})})
   router.push(`/incidents/${result.incidentId}?submitted=1`);router.refresh()
  }catch(e){setError('submit',e instanceof Error?e.message:'Report could not be saved. Your photos are still here; please retry.')}finally{setBusy('')}
 }
 const shownLocation=valid&&session?session.location:best
 const outsideArea=/outside|jurisdiction|civic area/i.test(errors.location)
 return <div className="report-workspace">
 <div className="report-rail">
  <nav className="report-stepper" aria-label="Report steps">{['Issue Type','Verify Location','Capture Evidence','Review & Submit'].map((label,index)=>{const number=index+1,complete=number<unlocked;return <button type="button" key={label} disabled={number>unlocked} aria-current={step===number?'step':undefined} className={complete?'is-complete':''} onClick={()=>setStep(number)}><span>{complete?<Check size={14}/>:number}</span><small>{label}</small></button>})}</nav>
  <div className="workflow-progress" aria-label="Report progress"><span>Step {step} of 4</span><div><i style={{width:`${step/4*100}%`}}/></div></div>
 </div>
 <div className="report-steps">
 <ReportingAreaBanner area={area}/>
 {step===1&&
 <StepCard number={1} title="Choose the issue type" description="Tell us how urgently your community needs attention." state="Current"><fieldset className="urgency-options"><legend className="sr-only">Issue urgency</legend>{[{value:'URGENT_HAZARD',title:'Urgent Civic Hazard',detail:'Dangerous road damage, serious obstruction or a public safety hazard.',Icon:TriangleAlert,tone:'amber'},{value:'MAINTENANCE',title:'Civic Maintenance',detail:'Garbage, cleanliness, road repair or routine infrastructure upkeep.',Icon:Wrench,tone:'green'}].map(({value,title,detail,Icon,tone})=><label key={value} className={`urgency-choice tone-${tone} ${urgency===value?'selected':''}`}><input type="radio" name="urgency" value={value} checked={urgency===value} disabled={busy==='submit'} onChange={()=>{setUrgency(value);setStep(2)}}/><span className="choice-icon"><Icon size={21}/></span><span><strong>{title}</strong><small>{detail}</small></span><span className="selection-mark">{urgency===value&&<Check size={13}/>}</span></label>)}</fieldset></StepCard>}
 {step===2&&
 <StepCard number={2} title="Verify your location" description={`A live reading within ${policy.maxAccuracyMeters} m accuracy protects report quality.`} state={errors.location?'Error':valid?'Complete':urgency?'Current':'Waiting'}>
 <div className="location-panel"><span className="location-symbol"><Navigation size={24}/></span><div><strong>{searching?'Finding your location…':valid?(session?.source==='demo'?'Demo location verified':'Live location verified'):'Place your report'}</strong><p>{session?.source==='demo'&&valid?'Server-selected demo point. This is not live GPS.':best?`${Math.round(best.accuracy)} m accuracy · ${accuracyQuality(best.accuracy,policy.maxAccuracyMeters)}`:'Your camera opens after a verified capture session.'}</p></div>{searching&&<LoaderCircle className="spin" size={22}/>}</div>
 {shownLocation&&<div className="location-map"><CivicMapFrame points={[{id:'selected',title:'Your verified location',category:null,status:'SELECTED',area,latitude:shownLocation.latitude,longitude:shownLocation.longitude}]} focus={{latitude:shownLocation.latitude,longitude:shownLocation.longitude,zoom:17}} accuracyMeters={shownLocation.accuracy} fitToPoints={false} legend={false} controls={false} label="Your verified reporting location"/></div>}
 {searching&&<p role="status" className="muted">Collecting readings for up to {policy.acquisitionMs/1000} seconds. Best accuracy: {best?`${Math.round(best.accuracy)} m`:'waiting for a reading'}.</p>}
 {errors.location&&<Alert tone="error">{errors.location}</Alert>}
 {outsideArea&&<div className="reporting-area-banner"><MapPin size={18}/><div><strong>This location is outside your active reporting area.</strong><span>Reports are accepted only inside {area}.</span></div><a className="text-link" href="/jurisdiction">Change active city</a></div>}
 {session&&!valid&&<Alert tone="warning">Your camera session expired. Photos stay visible, but a new session requires fresh captures.</Alert>}
 <div className="button-row"><button className="primary-button" disabled={!!busy||uploading} onClick={()=>locate('live')}><MapPin size={17}/>{valid?'Verify again':'Verify live location'}</button>{searching&&<button className="secondary-button" onClick={()=>geoAbort.current?.abort()}>Cancel search</button>}{demoEnabled&&!searching&&<button className="secondary-button" disabled={!!busy||uploading} onClick={()=>locate('demo')}>Use demo location</button>}</div>
 <p className="caption">The server confirms your position is inside {area} before a report is accepted; browsing the map anywhere does not change that. Laptops may use Wi-Fi positioning — try near a window or use a GPS-enabled phone.{demoEnabled?' Demo mode is explicitly enabled for this deployment.':''}</p>
 </StepCard>}
 {step===3&&<StepCard number={3} title="Capture live evidence" description={`Take up to ${REPORTING_POLICY.maxPhotos} clear photos. Initial evidence comes only from your camera.`} state={errors.camera||photos.some(p=>p.state==='Upload failed')?'Error':'Current'}>
 <div className="photo-counter"><Camera size={15}/><b>{photos.length}</b> / {REPORTING_POLICY.maxPhotos} photos captured</div>
 {!valid&&!camera&&!preview&&<div className="blocked-explanation"><LockKeyhole size={20}/><div><strong>Location verification comes first</strong><p>Complete step 2 to enable your camera.</p></div></div>}
 {camera&&<div className="camera-box"><div className="camera-label"><span className="live-dot"/> LIVE CAMERA<button aria-label="Close camera" onClick={stopCamera}><X size={18}/></button></div><video ref={video} autoPlay playsInline muted onLoadedData={()=>setCameraReady(true)} aria-label="Live camera preview"/><div className="camera-controls"><p>{cameraReady?'Keep the civic issue clearly in frame.':'Initializing your camera…'}</p><button className="capture-button" onClick={capturePhoto} disabled={!!busy||!cameraReady}><Camera size={20}/> Capture photo</button></div></div>}
 {preview&&<div className="camera-box"><div className="camera-label">REVIEW YOUR PHOTO</div><img src={preview.url} alt="Captured civic issue preview"/><div className="camera-controls"><button className="secondary-button" disabled={!!busy} onClick={()=>{setPreview(null);void openCamera()}}><RotateCcw size={16}/> Retake</button><button className="primary-button" disabled={!!busy||!valid} onClick={usePhoto}><Check size={16}/> Use this photo</button></div></div>}
 {!camera&&!preview&&photos.length<REPORTING_POLICY.maxPhotos&&<button className="secondary-button camera-open" disabled={!valid||!!busy||uploading} onClick={openCamera}><Camera size={18}/>{photos.length?'Capture another photo':'Open camera'}</button>}
 {busy==='camera'&&<p role="status" className="muted">Requesting your camera. Check the browser permission prompt.</p>}{errors.camera&&<Alert tone="error">{errors.camera}</Alert>}
 {!!photos.length&&<div className="photo-grid">{photos.map((p,index)=><article className="evidence-card" key={p.uploadId}><img src={p.url} alt={`Captured evidence ${index+1}`}/><div><strong>Photo {index+1}</strong><span className={`upload-state upload-${p.state.toLowerCase().replaceAll(' ','-')}`} role="status">{p.state==='Uploaded'?<Check size={14}/>:p.state==='Uploading'?<LoaderCircle className="spin" size={14}/>:<Upload size={14}/>} {p.state}</span>{p.error&&<p className="photo-error" role="alert">{p.error}</p>}<div className="evidence-actions">{p.state==='Upload failed'&&<button disabled={!valid||!!busy} onClick={()=>uploadPhoto(p)}>Retry upload</button>}<button disabled={p.state==='Uploading'||!!busy} onClick={()=>setPhotos(current=>current.filter(x=>x.uploadId!==p.uploadId))}><Trash2 size={13}/> Remove</button></div></div></article>)}</div>}
 {allUploaded&&<div className="step-continue"><button className="primary-button" onClick={()=>setStep(4)}>Continue to review <ArrowRight size={16}/></button></div>}
 </StepCard>}
 {step===4&&<StepCard number={4} title="Description and review" description="Add helpful context, then check your report before sending." state={errors.submit?'Error':'Current'}><label>Description <span className="muted">Optional</span><textarea rows={4} maxLength={500} disabled={busy==='submit'} value={description} onChange={e=>setDescription(e.target.value)} placeholder="What happened? What should your civic team know?"/><span className="caption character-count">{description.length} / 500</span></label><dl className="review-summary"><div><dt>Issue type</dt><dd>{urgency==='URGENT_HAZARD'?'Urgent Civic Hazard':'Civic Maintenance'}</dd></div><div><dt>Civic area</dt><dd>{area}</dd></div><div><dt>Evidence</dt><dd>{photos.filter(p=>p.state==='Uploaded').length} uploaded photo(s)</dd></div><div><dt>Location</dt><dd>{session?.source==='demo'?'Demo location':valid?'Verified live location':'Not yet verified'}</dd></div></dl>{aiEnabled&&<Alert>Your accepted photos will be sent to the configured AI provider for an advisory evidence-quality score. The score does not decide whether the report is accepted.</Alert>}{session?.source==='demo'&&<Alert tone="warning">This is a demo report. Its location is simulated and it stays private.</Alert>}{errors.submit&&<Alert tone="error">{errors.submit} Your captured photos have not been removed.</Alert>}</StepCard>}
 {step===4&&<div className="submit-bar"><div><strong>Ready to record your report?</strong><p>Your evidence stays private while awaiting review.</p></div><button className="primary-button" disabled={!!busy||!valid||!allUploaded||!urgency||!!preview||camera} onClick={submit}>{busy==='submit'?<><LoaderCircle className="spin" size={17}/> Verifying and submitting…</>:'Submit civic report'}</button></div>}
 </div>
 <aside className="report-aside">
  <Surface><span className="icon-tile"><ShieldCheck size={20}/></span><h3>Your safety comes first</h3><p className="muted">Stay out of traffic and restricted spaces. A clear photo from a safe distance is enough. For an immediate emergency, contact your local emergency service.</p></Surface>
  <Surface><span className="icon-tile"><LockKeyhole size={20}/></span><h3>Evidence, handled carefully</h3><p className="muted">Original photos stay private. Your report is recorded before any government review.</p></Surface>
 </aside>
 </div>
}
