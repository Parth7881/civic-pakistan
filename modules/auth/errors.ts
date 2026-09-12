type ProviderError={code?:string;status?:number;name?:string}
export function authErrorMessage(error:ProviderError):string {
 switch(error.code) {
  case 'user_already_exists':case 'email_exists':return 'An account already exists for this email. Sign in or recover your password.'
  case 'weak_password':return 'Choose a stronger password with at least 8 characters, uppercase, lowercase, a number, and a special character.'
  case 'email_address_invalid':case 'validation_failed':return 'Check your email address and account details.'
  case 'email_not_confirmed':return 'Confirm your email before signing in. Open the confirmation link in the browser where you signed up.'
  case 'invalid_credentials':return 'The email or password is incorrect. Try again or recover your password.'
  case 'signup_disabled':case 'email_provider_disabled':return 'Email registration is currently disabled. Contact the platform operator.'
  case 'over_email_send_rate_limit':case 'over_request_rate_limit':case 'over_sms_send_rate_limit':return 'Too many attempts. Wait a few minutes before trying again.'
  case 'email_address_not_authorized':return 'Email delivery is restricted by the provider. The platform operator needs to configure signup email delivery.'
  case 'otp_expired':case 'flow_state_expired':case 'flow_state_not_found':case 'bad_code_verifier':case 'bad_oauth_state':return 'This link expired or was opened in another browser. Request a new link and open it in the same browser.'
  case 'unexpected_failure':return 'Account services could not complete the request. Please retry or contact the platform operator.'
 }
 if(error.status===429)return 'Too many attempts. Wait a few minutes before trying again.'
 return 'Account services are unavailable. Please retry or contact the platform operator.'
}
export function logAuthFailure(operation:string,error:ProviderError) {
 if(process.env.NODE_ENV!=='development')return
 // Codes/status only: raw messages may contain email addresses, URLs, or other user data.
 console.warn(`[auth:${operation}]`,{code:error.code||'unknown',status:error.status||0,name:error.name||'AuthError'})
}
