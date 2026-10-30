import { api,db,row,rows,now,uuid,audit,ok,json,text,HttpError } from '../../lib/server';
import { hashPin,validPin } from '../../lib/auth';
export async function GET(request:Request){return api(request,'admin',async()=>ok({users:await rows('SELECT id,email,name,role,active,created_at,updated_at,pin_hash IS NOT NULL AS has_pin,EXISTS (SELECT 1 FROM app_sessions s WHERE s.user_id=users.id) AS has_signed_in FROM users ORDER BY created_at ASC'),resets:await rows("SELECT id,contact,requested_at FROM login_reset_requests WHERE status='pending' ORDER BY requested_at ASC")}));}
export async function POST(request:Request){return api(request,'admin',async actor=>{
 const b=await json(request);
 if(b.operation==='resolve_reset'){const id=text(b.id,'request',100);await db().prepare("UPDATE login_reset_requests SET status='resolved',resolved_at=?,resolved_by=? WHERE id=? AND status='pending'").bind(now(),actor.id,id).run();await audit(actor,'login_reset_resolved',{resetId:id});return ok({ok:true});}
 const name=text(b.name,'name',100),email=text(b.email,'email',254).toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new HttpError('Enter a valid email address.');
 if(b.role&&b.role!=='user'&&!(b.id===actor.id&&b.role==='admin'))throw new HttpError('There is one administrator. New accounts are users.');
 const pin=b.pin===undefined||b.pin===''?null:b.pin;if(pin!==null&&!validPin(pin))throw new HttpError('Use a six-digit PIN.');
 const duplicate=await row<any>('SELECT id FROM users WHERE email=? COLLATE NOCASE',email);if(duplicate&&duplicate.id!==b.id)throw new HttpError('This email is already on the user list.',409);
 const at=now(),hash=pin!==null?await hashPin(pin):null;
 if(b.id){const id=text(b.id,'user',100),old=await row<any>('SELECT * FROM users WHERE id=?',id);if(!old)throw new HttpError('User not found.',404);if(old.role==='admin'&&(!b.active||id!==actor.id))throw new HttpError('The administrator account must stay active.',409);
  await db().prepare('UPDATE users SET name=?,email=?,active=?,pin_hash=COALESCE(?,pin_hash),updated_at=? WHERE id=?').bind(name,email,b.active===true?1:0,hash,at,id).run();
  if(!b.active||hash)await db().prepare('UPDATE app_sessions SET ended_at=? WHERE user_id=? AND ended_at IS NULL AND id!=?').bind(at,id,id===actor.id?actor.sessionId:'').run();
  if(hash)await db().prepare("UPDATE login_reset_requests SET status='resolved',resolved_at=?,resolved_by=? WHERE status='pending' AND (contact=? COLLATE NOCASE OR contact=? COLLATE NOCASE OR contact=? COLLATE NOCASE)").bind(at,actor.id,old.email,email,old.name).run();
  await audit(actor,hash?'user_pin_reset':'user_updated',{userId:id,name,email,active:!!b.active});return ok({ok:true});
 }
 if(!hash)throw new HttpError('Set a six-digit PIN for the new user.');
 const id=uuid();await db().prepare("INSERT INTO users (id,email,name,role,active,pin_hash,created_at,updated_at) VALUES (?,?,?,'user',1,?,?,?)").bind(id,email,name,hash,at,at).run();await audit(actor,'user_added',{userId:id,email});return ok({id},201);
 });}
