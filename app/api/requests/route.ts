import { api,db,row,now,uuid,audit,ok,json,text,HttpError } from '../../lib/server';
import { parseInput,calculate } from '../../lib/domain';
import { bloodTests,GUIDE_VERSION } from '../../lib/rules';
export async function POST(request:Request){return api(request,'user',async actor=>{
 const body=await json(request),viewing=body.operation==='view';
 if(body.operation==='confirm'){
  if(body.attested!==true)throw new HttpError('Confirm that you entered the request in ICE.');const id=text(body.id,'request',100);
  const existing=await row<any>('SELECT * FROM test_requests WHERE id=? AND user_id=?',id,actor.id);if(!existing)throw new HttpError('Request not found.',404);
  if(existing.status==='staff_confirmed')return ok({request:existing});
  const available=JSON.parse(existing.tests).map((t:any)=>t.testName);if(!Array.isArray(body.tests)||!body.tests.length||body.tests.some((t:unknown)=>typeof t!=='string'||!available.includes(t)))throw new HttpError('Select the prepared tests you entered in ICE.');const confirmed=[...new Set(body.tests as string[])];
  const at=now(),result=await db().prepare("UPDATE test_requests SET status='staff_confirmed',confirmed_at=?,confirmed_tests=? WHERE id=? AND user_id=? AND status='prepared'").bind(at,JSON.stringify(confirmed),id,actor.id).run();if(result.meta.changes)await audit(actor,'request_confirmed',{requestId:id,tests:confirmed,confirmation:'Staff attestation; not verified by ICE'});
  return ok({request:await row('SELECT * FROM test_requests WHERE id=?',id)});
 }
 let input;try{input=parseInput(body.input);}catch(e){throw new HttpError((e as Error).message);}
 const missing=input.selectedDiseases.filter(name=>!Object.values(bloodTests).some(map=>Object.prototype.hasOwnProperty.call(map,name)));if(missing.length)throw new HttpError('No published test mapping for '+missing.join(', ')+'. Confirm the appropriate pathway with a clinician.');
 if(!viewing&&(body.checks?.recentResults!==true||body.checks?.monitoring!==true))throw new HttpError('Complete the final checks before saving the prepared list.');
 const tests=calculate(input);if(!tests.length)throw new HttpError('There are no matching tests to save.');
 const clientKey=text(body.clientKey,'request reference',100),prior=await row<any>('SELECT * FROM test_requests WHERE user_id=? AND client_key=?',actor.id,clientKey);
 if(prior){if(prior.inputs!==JSON.stringify(input))throw new HttpError('This request reference was already used for different selections. Start a new request.',409);return ok({request:prior});}
 const id=uuid(),at=now();
 const inserted=await db().prepare("INSERT INTO test_requests (id,user_id,session_id,client_key,prepared_at,status,inputs,tests,rule_version) VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT(user_id,client_key) DO NOTHING").bind(id,actor.id,actor.sessionId,clientKey,at,viewing?'viewed':'prepared',JSON.stringify(input),JSON.stringify(tests),GUIDE_VERSION).run();
 const saved=await row<any>('SELECT * FROM test_requests WHERE user_id=? AND client_key=?',actor.id,clientKey);
 if(inserted.meta.changes)await audit(actor,viewing?'request_viewed':'request_prepared',{requestId:saved.id,tests:tests.map(t=>t.testName),ruleVersion:GUIDE_VERSION});
 return ok({request:saved},inserted.meta.changes?201:200);
 });}
