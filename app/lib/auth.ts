import { cookies } from 'next/headers';
import { nextLondonMidnight } from './session-time';
import { db,row,now,uuid,HttpError,type Actor } from './server';
const hex=(bytes:ArrayBuffer|Uint8Array)=>Array.from(bytes instanceof Uint8Array?bytes:new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
export async function digest(value:string){return hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)));}
export function validPin(value:unknown):value is string{return typeof value==='string'&&/^\d{6}$/.test(value);}
export async function hashPin(pin:string,salt=hex(crypto.getRandomValues(new Uint8Array(16)))){
 if(!validPin(pin))throw new HttpError('Use a six-digit PIN.');
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(pin),'PBKDF2',false,['deriveBits']);
 const hash=await crypto.subtle.deriveBits({name:'PBKDF2',salt:new TextEncoder().encode(salt),iterations:100000,hash:'SHA-256'},key,256);
 return 'pbkdf2:100000:'+salt+':'+hex(hash);
}
export async function verifyPin(pin:string,stored:string|null){const parts=(stored||'').split(':'),salt=parts.length===4?parts[2]:'00000000000000000000000000000000';const calculated=await hashPin(pin,salt);if(!stored||parts[0]!=='pbkdf2'||parts[1]!=='100000'||calculated.length!==stored.length)return false;let different=0;for(let i=0;i<stored.length;i++)different|=stored.charCodeAt(i)^calculated.charCodeAt(i);return different===0;}
export async function startSession(user:any){const token=hex(crypto.getRandomValues(new Uint8Array(32))),id=uuid(),at=now(),expires=nextLondonMidnight(at).toISOString();await db().batch([
 db().prepare('INSERT INTO app_sessions (id,user_id,token_hash,login_at,expires_at) VALUES (?,?,?,?,?)').bind(id,user.id,await digest(token),at,expires),
 db().prepare('INSERT INTO audit_events (id,user_id,session_id,event,at,details) VALUES (?,?,?,?,?,?)').bind(uuid(),user.id,id,'login',at,JSON.stringify({actorName:user.name,actorEmail:user.email})),
 ]);(await cookies()).set('hgp-session',token,{httpOnly:true,secure:true,sameSite:'lax',path:'/',expires:new Date(expires)});return{...user,sessionId:id} as Actor;}
export async function takeAttempt(bucket:string,max:number,minutes=15){const key=await digest(bucket),at=Date.now(),until=at+minutes*60000;await db().prepare('INSERT INTO login_attempts (key,attempts,reset_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN reset_at<=? THEN 1 ELSE attempts+1 END,reset_at=CASE WHEN reset_at<=? THEN excluded.reset_at ELSE reset_at END').bind(key,until,at,at).run();const state=await row<any>('SELECT attempts FROM login_attempts WHERE key=?',key);if(state.attempts>max)throw new HttpError('Too many attempts. Please try again in 15 minutes.',429);return key;}
export function sameOrigin(request:Request){if(request.headers.get('origin')!==new URL(request.url).origin)throw new HttpError('This request did not originate from this app.',403);}
