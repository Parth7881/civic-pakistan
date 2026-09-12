export function profileRoleLabel(role:string|null|undefined){
 if(role==='platform_admin')return 'Platform Admin'
 if(role==='government_user')return 'Government Officer'
 return 'Citizen'
}

export function profileDisplayName(name:string|null|undefined,role:string|null|undefined,metadataName?:unknown){
 const profile=(name||'').trim()
 const metadata=typeof metadataName==='string'?metadataName.trim():''
 const genericGovernmentName=role!=='citizen'&&profile.toLowerCase()==='citizen'
 if(profile&&!genericGovernmentName)return profile
 if(metadata&&!(role!=='citizen'&&metadata.toLowerCase()==='citizen'))return metadata
 return profileRoleLabel(role)
}
