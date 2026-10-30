import { api,db,row,rows,now,uuid,audit,ok,json,text,HttpError,ensureRole,decodePrompt,londonDate } from '../../lib/server';
import { diseases } from '../../lib/rules';
export async function GET(request:Request){return api(request,'user',async actor=>{
 const manage=new URL(request.url).searchParams.get('manage')==='1';
 if(manage){ensureRole(actor,'admin');return ok({prompts:(await rows<any>('SELECT * FROM prompts ORDER BY updated_at DESC')).map(decodePrompt)});}
 const today=londonDate();const available=await rows<any>("SELECT p.* FROM prompts p WHERE p.status='published' AND (p.start_date IS NULL OR p.start_date<=?) AND (p.end_date IS NULL OR p.end_date>=?) AND (p.frequency!='acknowledged' OR NOT EXISTS (SELECT 1 FROM prompt_acknowledgements a WHERE a.prompt_id=p.id AND a.user_id=? AND a.revision=p.revision)) ORDER BY CASE p.priority WHEN 'important' THEN 0 ELSE 1 END,p.updated_at DESC",today,today,actor.id);
 return ok({prompts:available.map(decodePrompt)});
 });}
export async function POST(request:Request){return api(request,'user',async actor=>{
 const b=await json(request);
 if(b.operation==='delete'){
  ensureRole(actor,'admin');const id=text(b.id,'popup',100),old=await row<any>('SELECT * FROM prompts WHERE id=?',id);if(!old)throw new HttpError('Popup not found.',404);
  if(b.revision!==old.revision)throw new HttpError('This popup changed. Refresh and check it before deleting.',409);
  const at=now();await db().batch([
   db().prepare('DELETE FROM prompt_acknowledgements WHERE prompt_id=?').bind(id),
   db().prepare('DELETE FROM prompts WHERE id=?').bind(id),
   db().prepare('INSERT INTO audit_events (id,user_id,session_id,event,at,details) VALUES (?,?,?,?,?,?)').bind(uuid(),actor.id,actor.sessionId,'prompt_deleted',at,JSON.stringify({promptId:id,title:old.title,revision:old.revision,actorName:actor.name,actorEmail:actor.email})),
  ]);return ok({ok:true});
 }
 if(b.operation==='acknowledge'){
  const id=text(b.id,'prompt',100),prompt=await row<any>("SELECT * FROM prompts WHERE id=? AND status='published'",id);if(!prompt||b.revision!==prompt.revision)throw new HttpError('This notice changed. Refresh the app and read the current version.',409);
  const at=now();await db().prepare('INSERT INTO prompt_acknowledgements (id,user_id,prompt_id,revision,at) VALUES (?,?,?,?,?) ON CONFLICT(user_id,prompt_id,revision) DO NOTHING').bind(uuid(),actor.id,id,prompt.revision,at).run();await audit(actor,'prompt_acknowledged',{promptId:id,title:prompt.title,revision:prompt.revision});return ok({ok:true});
 }
 ensureRole(actor,'admin');const title=text(b.title,'title',140),body=text(b.body,'message',6000),id=b.id?text(b.id,'prompt',100):uuid(),old=b.id?await row<any>('SELECT * FROM prompts WHERE id=?',id):null;
 if(b.id&&!old)throw new HttpError('Prompt not found.',404);
 if(!['login','condition','review'].includes(b.stage)||!['request','session','acknowledged'].includes(b.frequency)||!['none','audit','guidance','monitoring'].includes(b.action)||!['info','important'].includes(b.priority)||!['draft','published','archived'].includes(b.status))throw new HttpError('Check the popup settings.');
 if(!Array.isArray(b.conditions)||b.conditions.length>diseases.length||b.conditions.some((c:unknown)=>!diseases.some(d=>d.name===c)))throw new HttpError('Choose valid trigger conditions.');
 if(!Array.isArray(b.checklist)||b.checklist.length>20||b.checklist.some((c:unknown)=>typeof c!=='string'||c.length>250))throw new HttpError('Use up to 20 short checklist items.');
 const date=(v:unknown)=>{if(v===''||v===null||v===undefined)return null;if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v)||Number.isNaN(Date.parse(v)))throw new HttpError('Choose valid schedule dates.');return v;};const start=date(b.startDate),end=date(b.endDate);if(start&&end&&end<start)throw new HttpError('The end date must not be before the start date.');
 const revision=old?old.revision+1:1,at=now();await db().prepare('INSERT INTO prompts (id,title,body,checklist,stage,conditions,frequency,action,priority,status,start_date,end_date,revision,updated_by,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title,body=excluded.body,checklist=excluded.checklist,stage=excluded.stage,conditions=excluded.conditions,frequency=excluded.frequency,action=excluded.action,priority=excluded.priority,status=excluded.status,start_date=excluded.start_date,end_date=excluded.end_date,revision=excluded.revision,updated_by=excluded.updated_by,updated_at=excluded.updated_at').bind(id,title,body,JSON.stringify(b.checklist.map((s:string)=>s.trim()).filter(Boolean)),b.stage,JSON.stringify([...new Set(b.conditions)]),b.frequency,b.action,b.priority,b.status,start,end,revision,actor.id,at).run();
 await audit(actor,b.status==='published'?'prompt_published':b.status==='archived'?'prompt_archived':'prompt_draft_saved',{promptId:id,title,revision});return ok({prompt:decodePrompt(await row<any>('SELECT * FROM prompts WHERE id=?',id))});
 });}
