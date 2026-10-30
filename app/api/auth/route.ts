import { getChatGPTUser } from '../../chatgpt-auth';
import { ownerRecoveryEnabled } from '../../lib/deployment';
import { db,row,ok,json,text,now,uuid,HttpError } from '../../lib/server';
import { takeAttempt,verifyPin,validPin,startSession,sameOrigin } from '../../lib/auth';
export async function POST(request:Request){try{
 sameOrigin(request);const b=await json(request);
 if(b.operation==='owner'){
  if(!ownerRecoveryEnabled())throw new HttpError('Administrator recovery is managed in your Cloudflare account.',403);
  const identity=await getChatGPTUser();if(!identity)throw new HttpError('Sign in with your owner account to set up or recover the administrator login.',401);
  const user=await row<any>("SELECT * FROM users WHERE auth_id=? AND role='admin' AND active=1",identity.userId);if(!user)throw new HttpError('This is not the administrator account.',403);
  await startSession(user);return ok({ok:true});
 }
 if(b.operation==='forgot'){
  const contact=text(b.contact,'your name or email address',254);await takeAttempt('reset:'+contact.toLowerCase(),3);
  await db().prepare("INSERT INTO login_reset_requests (id,contact,requested_at,status) SELECT ?,?,?,'pending' WHERE NOT EXISTS (SELECT 1 FROM login_reset_requests WHERE contact=? COLLATE NOCASE AND status='pending')").bind(uuid(),contact,now(),contact).run();
  return ok({message:'Your request has been sent to the administrator. Contact Christian for your sign-in details or a new PIN.'});
 }
 if(b.operation!=='login')throw new HttpError('Choose a valid sign-in action.');
 const email=text(b.email,'email',254).toLowerCase();if(!validPin(b.pin))throw new HttpError('Enter your email address and six-digit PIN.');
 const bucket=await takeAttempt('login:'+email,5);const user=await row<any>('SELECT * FROM users WHERE email=? COLLATE NOCASE',email);
 const matches=await verifyPin(b.pin,user?.pin_hash||null);if(!matches||!user?.active)throw new HttpError('Email or PIN not recognised. Try again or request a reset.',401);
 await db().prepare('DELETE FROM login_attempts WHERE key=?').bind(bucket).run();await startSession(user);return ok({ok:true});
 }catch(e){const status=e instanceof HttpError?e.status:500;if(status===500)console.error('Sign-in action failed');return Response.json({error:status===500?'Could not complete sign-in. Please try again.':(e as Error).message},{status,headers:{'Cache-Control':'no-store'}});}}
