export function cameraError(error:unknown):string {
 const name=error instanceof Error?error.name:''
 const messages:Record<string,string>={NotAllowedError:'Camera permission is blocked. Allow camera access in your browser settings, then try again.',NotFoundError:'No camera was found. Connect a webcam or open this page on a camera-equipped phone.',NotReadableError:'The camera is in use or unavailable. Close other camera apps and retry.',OverconstrainedError:'This camera does not support the requested settings. Try another camera or browser.',AbortError:'Camera initialization was interrupted. Please try again.',SecurityError:'Camera access needs a secure HTTPS connection or localhost.'}
 return messages[name]||(error instanceof Error?error.message:'The camera could not initialize. Check your device and retry.')
}
