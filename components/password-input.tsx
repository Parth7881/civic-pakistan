'use client'
import { useState,type InputHTMLAttributes } from 'react'
import { Eye,EyeOff } from 'lucide-react'

type Props=Omit<InputHTMLAttributes<HTMLInputElement>,'type'>

export function PasswordInput(props:Props){
 const [visible,setVisible]=useState(false)
 return <span className="password-input-wrap">
  <input {...props} type={visible?'text':'password'}/>
  <button type="button" className="password-toggle" aria-label={visible?'Hide password':'Show password'} aria-pressed={visible} onClick={()=>setVisible(value=>!value)}>
   {visible?<EyeOff size={18}/>:<Eye size={18}/>}<span className="sr-only">{visible?'Hide password':'Show password'}</span>
  </button>
 </span>
}
