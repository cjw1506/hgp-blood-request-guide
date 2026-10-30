import { env } from 'cloudflare:workers';
import { cookies } from 'next/headers';
import { digest } from './auth';
import { sessionExpiry } from './session-time';
import { defaultGuidance, type Prompt } from './domain';
export type Actor={id:string;auth_id:string;email:string;name:string;role:'admin'|'user';active:number;pin_hash?:string|null;sessionId:string;sessionExpiresAt:string};
export class HttpError extends Error{constructor(message:string,public status=400){super(message);}}
export const db=()=>{if(!env.DB)throw new HttpError('The database is not available.',503);return env.DB;};
export const now=()=>new Date().toISOString();
export const uuid=()=>crypto.randomUUID();
export async function row<T=Record<string,unknown>>(sql:string,...values:any[]){return db().prepare(sql).bind(...values).first<T>();}
export async function rows<T=Record<string,unknown>>(sql:string,...values:any[]){return(await db().prepare(sql).bind(...values).all<T>()).results;}
export async function audit(actor:Actor,event:string,details:Record<string,unknown>={}){await db().prepare('INSERT INTO audit_events (id,user_id,session_id,event,at,details) VALUES (?,?,?,?,?,?)').bind(uuid(),actor.id,actor.sessionId,event,now(),JSON.stringify({...details,actorName:actor.name,actorEmail:actor.email})).run();}
export async function getActor():Promise<Actor>{
 const token=(await cookies()).get('hgp-session')?.value;if(!token||!/^([0-9a-f]{64})$/.test(token))throw new HttpError('Please sign in to continue.',401);
 const session=await row<any>('SELECT * FROM app_sessions WHERE token_hash=? AND ended_at IS NULL AND expires_at>?',await digest(token),now());if(!session)throw new HttpError('Your session has ended. Please sign in again.',401);
 const expiresAt=sessionExpiry(session.login_at,session.expires_at);if(Date.parse(expiresAt)<=Date.now())throw new HttpError('Please sign in for today.',401);
 const user=await row<any>('SELECT * FROM users WHERE id=?',session.user_id);if(!user?.active)throw new HttpError('This account is inactive. Contact Christian.',403);
 return{...user,sessionId:session.id,sessionExpiresAt:expiresAt} as Actor;
}

export function ensureRole(actor:Actor,role:'admin'|'user'){if(role==='admin'&&actor.role!=='admin')throw new HttpError('You do not have permission for this action.',403);}
export async function api(request:Request,role:'admin'|'user',fn:(actor:Actor)=>Promise<Response>){
 try{
  if(!['GET','HEAD'].includes(request.method)){const origin=request.headers.get('origin');if(!origin||origin!==new URL(request.url).origin)throw new HttpError('This request did not originate from this app.',403);}
  const actor=await getActor();ensureRole(actor,role);return await fn(actor);
 }catch(error){const status=error instanceof HttpError?error.status:500;if(status===500)console.error('HGP API error',error instanceof Error?error.message:'Unknown error');return Response.json({error:status===500?'The action could not be completed. Please try again.':(error as Error).message},{status,headers:{'Cache-Control':'no-store'}});}
}
export async function json(request:Request):Promise<Record<string,any>>{if(Number(request.headers.get('content-length')||0)>65536)throw new HttpError('The submitted form is too large.',413);try{const value=await request.json();if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Invalid object');return value as Record<string,any>;}catch{throw new HttpError('Invalid form data.');}}
export function text(value:unknown,label:string,max=300,optional=false){if(typeof value!=='string'||value.length>max||!optional&&!value.trim())throw new HttpError('Check '+label+'.');return value.trim();}
export const ok=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export function decodePrompt(p:any):Prompt{return{id:p.id,title:p.title,body:p.body,checklist:JSON.parse(p.checklist),conditions:JSON.parse(p.conditions),stage:p.stage,frequency:p.frequency,action:p.action,priority:p.priority,status:p.status,startDate:p.start_date,endDate:p.end_date,revision:p.revision,updatedAt:p.updated_at,updatedBy:p.updated_by};}
export async function guidance(){return(await row<any>("SELECT value FROM settings WHERE key='guidance'"))?.value||defaultGuidance;}
export function londonDate(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
export function dateBoundary(value:string,next=false){if(!/^\d{4}-\d{2}-\d{2}$/.test(value)||Number.isNaN(Date.parse(value)))throw new HttpError('Invalid date filter.');let t=Date.parse(value+'T00:00:00Z');if(next)t+=86400000;const hour=Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',hour:'2-digit',hourCycle:'h23'}).format(new Date(t)));return new Date(t-hour*3600000).toISOString();}
