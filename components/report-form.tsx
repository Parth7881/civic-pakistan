'use client'
import { useEffect,useRef,useState } from 'react'
import { useRouter } from 'next/navigation'
import { Camera,MapPin,Check,RotateCcw } from 'lucide-react'
import { getLiveLocation } from '@/modules/reports/location'
import type { LiveLocation } from '@/modules/reports/validation'
type Photo={url:string;blob:Blob;capturedAt:number;uploadId:string;uploaded?:boolean}
type Capture={sessionId:string;expiresAt:number}
async function requestJson(url:string,init:RequestInit) {
 const response=await fetch(url,init)
 let result
 try {result=await response.json()}catch{throw new Error('The server could not receive your report. Try fewer photos or retry your connection.')}
 if(!response.ok) throw new Error(result.error||'The request failed. Please try again.')
 return result
}
export function ReportForm({area}:{area:string}) {
 const router=useRouter(),video=useRef<HTMLVideoElement>(null),stream=useRef<MediaStream|null>(null),mounted=useRef(true)
 const [location,setLocation]=useState<LiveLocation|null>(null),[session,setSession]=useState<Capture|null>(null)
 const [photos,setPhotos]=useState<Photo[]>([]),[preview,setPreview]=useState<Photo|null>(null),[camera,setCamera]=useState(false)
 const [urgency,setUrgency]=useState(''),[description,setDescription]=useState(''),[busy,setBusy]=useState(''),[error,setError]=useState('')
 function stopCamera(){stream.current?.getTracks().forEach(track=>track.stop());stream.current=null;setCamera(false)}
 useEffect(()=>{mounted.current=true;return ()=>{mounted.current=false;stream.current?.getTracks().forEach(track=>track.stop())}},[])
 useEffect(()=>{if(camera&&video.current) video.current.srcObject=stream.current},[camera])
 async function locate(){
  setBusy('Checking your location…');setError('');stopCamera()
  try {const loc=await getLiveLocation();const capture=await requestJson('/api/capture',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(loc)});setLocation(loc);setSession(capture);setPhotos([]);setPreview(null)}catch(e){setError(e instanceof Error?e.message:'Unable to verify location.');setSession(null)}finally{setBusy('')}
 }
 async function openCamera(){
  setError('');setBusy('Opening camera…')
  try {
   if(!navigator.mediaDevices?.getUserMedia) throw new Error('Camera access needs HTTPS or localhost and a supported browser.')
   if(!session||Date.now()>session.expiresAt) throw new Error('Your capture session expired. Verify your location again.')
   const next=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1600},height:{ideal:1200}},audio:false})
   if(!mounted.current){next.getTracks().forEach(track=>track.stop());return}
   stream.current=next;setCamera(true)
  }catch(e){setError(e instanceof DOMException&&e.name==='NotAllowedError'?'Camera permission was denied. Allow camera access in browser settings.':e instanceof Error?e.message:'The camera is unavailable.')}finally{setBusy('')}
 }
 async function capture(){
  if(!video.current?.videoWidth||!location) {setError('Wait for the camera preview before capturing.');return}
  setBusy('Preparing photo…');setError('')
  try {
   const canvas=document.createElement('canvas'),ratio=Math.min(1,1600/video.current.videoWidth)
   canvas.width=Math.round(video.current.videoWidth*ratio);canvas.height=Math.round(video.current.videoHeight*ratio)
   canvas.getContext('2d')!.drawImage(video.current,0,0,canvas.width,canvas.height)
   const now=Date.now(),piexif=(await import('piexifjs')).default
   const dms=(value:number)=>{const n=Math.abs(Number(value.toFixed(5))),d=Math.floor(n),m=Math.floor((n-d)*60);return [[d,1],[m,1],[Math.round(((n-d)*60-m)*60*10000),10000]]}
   const time=new Date(now).toISOString().slice(0,19).replace(/-/g,':').replace('T',' ')
   const exif=piexif.dump({'0th':{306:time},Exif:{36867:time},GPS:{1:location.latitude<0?'S':'N',2:dms(location.latitude),3:location.longitude<0?'W':'E',4:dms(location.longitude)}})
   const url=piexif.insert(exif,canvas.toDataURL('image/jpeg',0.82)),blob=await (await fetch(url)).blob()
   if(blob.size>2*1024*1024) throw new Error('Photo is too large. Retake it with a simpler frame.')
   setPreview({url,blob,capturedAt:now,uploadId:crypto.randomUUID()});stopCamera()
  }catch(e){setError(e instanceof Error?e.message:'Photo capture failed.')}finally{setBusy('')}
 }
 async function submit(){
  if(!session||!photos.length||!urgency)return
  setBusy('Refreshing GPS and submitting…');setError('');stopCamera()
  try {
   if(Date.now()>session.expiresAt) throw new Error('Camera session expired. Verify location and capture again.')
   for(let index=0;index<photos.length;index++) {
    const photo=photos[index]
    if(photo.uploaded)continue
    setBusy(`Uploading photo ${index+1} of ${photos.length}…`)
    const form=new FormData();form.set('sessionId',session.sessionId);form.set('uploadId',photo.uploadId);form.set('capturedAt',String(photo.capturedAt));form.set('photo',photo.blob,'capture.jpg')
    await requestJson('/api/evidence',{method:'POST',body:form})
    setPhotos(current=>current.map(p=>p.uploadId===photo.uploadId?{...p,uploaded:true}:p))
   }
   setBusy('Refreshing GPS and saving report…')
   const fresh=await getLiveLocation();setLocation(fresh)
   const result=await requestJson('/api/reports',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:session.sessionId,urgency,description,location:fresh,uploadIds:photos.map(p=>p.uploadId)})})
   router.push(`/incidents/${result.incidentId}?submitted=1`);router.refresh()
  }catch(e){setError(e instanceof Error?e.message:'Report submission failed. Your photos remain here so you can retry.')}finally{setBusy('')}
 }
 return <div className="report-workspace"><div className="form-stack">
 <fieldset><legend><span className="step">1</span> What kind of problem?</legend><div className="urgency-options">{[['URGENT_HAZARD','Urgent Civic Hazard','An immediate civic danger or obstruction.'],['MAINTENANCE','Civic Maintenance','A repair, cleanliness, or upkeep issue.']].map(([value,title,detail])=><label className={`urgency-choice ${urgency===value?'selected':''}`} key={value}><input type="radio" name="urgency" value={value} checked={urgency===value} onChange={()=>setUrgency(value)}/><span><strong>{title}</strong><small>{detail}</small></span></label>)}</div></fieldset>
 <section><h2><span className="step">2</span> Verify your location</h2><p className="muted">You must be inside {area}. We’ll refresh GPS when you submit.</p><button className="secondary-button" disabled={!!busy} onClick={locate}><MapPin size={18}/>{session?'Verify location again':'Use my live location'}</button>{session&&location&&<p className="success-message"><Check size={16}/> Location verified · accuracy {Math.round(location.accuracy)} m</p>}<p className="caption">Verifying again starts a new five-minute camera session and clears captured photos.</p></section>
 <section><h2><span className="step">3</span> Capture live evidence</h2><p className="muted">Take 1–5 photos here. Keep people and private details out of frame.</p>
 {camera&&<div className="camera-box"><video ref={video} autoPlay playsInline muted aria-label="Live camera preview"/><div className="button-row"><button className="primary-button" onClick={capture} disabled={!!busy}><Camera size={18}/> Capture photo</button><button className="secondary-button" onClick={stopCamera}>Close camera</button></div></div>}
 {preview&&<div className="camera-box"><img src={preview.url} alt="Your captured evidence preview"/><div className="button-row"><button className="secondary-button" disabled={!!busy} onClick={()=>{setPreview(null);void openCamera()}}><RotateCcw size={16}/> Retake</button><button className="primary-button" disabled={!!busy} onClick={()=>{setPhotos([...photos,preview]);setPreview(null)}}>Use this photo</button></div></div>}
 {!camera&&!preview&&photos.length<5&&<button className="secondary-button" disabled={!session||!!busy} onClick={openCamera}><Camera size={18}/>{photos.length?'Take another photo':'Open camera'}</button>}
 {!!photos.length&&<div className="photo-strip">{photos.map((p,index)=><div key={p.capturedAt}><img src={p.url} alt={`Evidence photo ${index+1}`}/><button disabled={!!busy} onClick={()=>setPhotos(photos.filter((_,i)=>i!==index))}>Remove photo {index+1}</button></div>)}</div>}
 </section><label><span className="label-heading"><span className="step">4</span> Add a description <span className="muted">(optional)</span></span><textarea rows={4} maxLength={500} value={description} onChange={e=>setDescription(e.target.value)} placeholder="What happened? What should the civic team know?"/><span className="caption">{description.length}/500 characters</span></label>
 {error&&<p role="alert" className="error-message">{error}</p>}{busy&&<p role="status">{busy}</p>}
 <button className="primary-button submit-button" disabled={!!busy||!session||!photos.length||!urgency||!!preview||camera} onClick={submit}>{busy?'Please wait…':'Submit civic report'}</button>
 </div><aside className="report-aside"><p className="eyebrow">A useful report starts here</p><h2>Show the problem clearly.</h2><p>Stay safe. Don’t enter traffic or restricted areas to capture evidence.</p><hr/><p>Your report and photos stay private while awaiting review. Submission does not mean the issue has been accepted or resolved.</p><p className="caption">Demo coverage uses approximate civic-area boundaries.</p></aside></div>
}
