import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import ts from 'typescript';
const root=process.cwd(),sqlite=new DatabaseSync(':memory:');sqlite.exec('PRAGMA foreign_keys=ON');
for(const name of fs.readdirSync('drizzle').filter(n=>n.endsWith('.sql')).sort())sqlite.exec(fs.readFileSync(path.join('drizzle',name),'utf8'));
class Statement{
 constructor(sql,values=[]){this.sql=sql;this.values=values;}
 bind(...values){return new Statement(this.sql,values);}
 async first(){return sqlite.prepare(this.sql).get(...this.values)||null;}
 async all(){return{results:sqlite.prepare(this.sql).all(...this.values)};}
 async run(){const result=sqlite.prepare(this.sql).run(...this.values);return{success:true,meta:{changes:Number(result.changes)}};}
}
const DB={prepare:sql=>new Statement(sql),batch:async statements=>{sqlite.exec('BEGIN');try{const out=[];for(const statement of statements)out.push(await statement.run());sqlite.exec('COMMIT');return out;}catch(e){sqlite.exec('ROLLBACK');throw e;}}};
const workerEnv={DB};
let identity=null,browserKey='owner-browser';const jars=new Map(),cache=new Map();
function jar(){const key=browserKey;if(!jars.has(key))jars.set(key,new Map());const values=jars.get(key);return{get:n=>values.has(n)?{value:values.get(n)}:undefined,set:(n,v,options)=>{assert.equal(options.httpOnly,true);assert.equal(options.secure,true);assert.equal(options.maxAge,undefined);assert(options.expires instanceof Date,'Browser cookie must persist across reopening until midnight');assert.equal(options.expires.toISOString(),sessionTime.nextLondonMidnight().toISOString());values.set(n,v);},delete:n=>values.delete(n)};}
function load(file){file=path.resolve(root,file);if(cache.has(file))return cache.get(file).exports;const module={exports:{}};cache.set(file,module);const compiled=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
 const require=name=>{if(name==='cloudflare:workers')return{env:workerEnv};if(name==='next/headers')return{cookies:async()=>jar()};if(name.endsWith('chatgpt-auth'))return{getChatGPTUser:async()=>identity};if(name.startsWith('.'))return load(path.resolve(path.dirname(file),name)+'.ts');throw Error('Unexpected test import '+name);};new Function('require','module','exports',compiled)(require,module,module.exports);return module.exports;}
const domain=load('app/lib/domain.ts'),rules=load('app/lib/rules.ts'),sessionTime=load('app/lib/session-time.ts');
for(const [at,expected] of [['2026-10-30T09:00:00Z','2026-10-31T00:00:00.000Z'],['2026-07-15T21:00:00Z','2026-07-15T23:00:00.000Z'],['2026-03-28T23:30:00Z','2026-03-29T00:00:00.000Z'],['2026-03-29T00:30:00Z','2026-03-29T23:00:00.000Z'],['2026-10-24T23:30:00Z','2026-10-26T00:00:00.000Z'],['2026-10-25T01:30:00Z','2026-10-26T00:00:00.000Z'],['2026-12-31T23:59:00Z','2027-01-01T00:00:00.000Z']])assert.equal(sessionTime.nextLondonMidnight(at).toISOString(),expected);
assert.equal(sessionTime.sessionExpiry('2026-10-30T09:00:00Z','2026-11-01T00:00:00Z'),'2026-10-31T00:00:00.000Z');
const anon={userId:'owner-identity',email:'owner@example.test',displayName:'Test owner',fullName:'Test owner'};
let checks=0;
async function request(endpoint,body,query='',origin='https://hgp.test'){
 const module=load('app/api/'+endpoint+'/route.ts'),method=body===undefined?'GET':'POST';const req=new Request('https://hgp.test/api/'+endpoint+query,{method,headers:{origin,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});const response=await module[method](req);const content=response.headers.get('content-type')?.includes('application/json')?await response.json():await response.text();checks++;return{status:response.status,data:content};
}
function good(response,status=200){assert.equal(response.status,status,JSON.stringify(response.data));return response.data;}
// Existing administrator is preserved; anonymous visitors cannot create accounts.
sqlite.prepare("INSERT INTO users (id,auth_id,email,name,role,active,created_at,updated_at) VALUES ('owner-id','owner-identity','owner@example.test','Test owner','admin',1,?,?)").run(new Date().toISOString(),new Date().toISOString());
assert.equal((await request('me')).status,401);assert.equal((await request('users')).status,401);assert.equal((await request('prompts')).status,401);assert.equal((await request('activity')).status,401);
assert.equal((await request('auth',{operation:'owner'})).status,401);
identity={...anon,userId:'intruder-id'};assert.equal((await request('auth',{operation:'owner'})).status,403);
identity=anon;good(await request('auth',{operation:'owner'}));let me=good(await request('me'));assert.equal(me.user.role,'admin');assert(me.user.needsPin);
workerEnv.HGP_SELF_HOSTED='1';assert.equal((await request('auth',{operation:'owner'})).status,403,'Self-hosted app must reject Sites identity headers even when they match the admin');delete workerEnv.HGP_SELF_HOSTED;
assert.equal(sqlite.prepare("SELECT COUNT(*) n FROM audit_events WHERE event='login'").get().n,1);good(await request('me'));assert.equal(sqlite.prepare("SELECT COUNT(*) n FROM audit_events WHERE event='login'").get().n,1);
const dailySession=sqlite.prepare('SELECT * FROM app_sessions WHERE id=?').get(me.sessionId);assert.equal(dailySession.expires_at,sessionTime.nextLondonMidnight(dailySession.login_at).toISOString());assert.equal(me.sessionExpiresAt,dailySession.expires_at);
// Reopening the same browser retains the cookie/session, without another login event.
good(await request('me'));assert.equal(good(await request('me')).sessionId,me.sessionId);
// Even a legacy session with an overly long expiry cannot cross UK midnight.
sqlite.prepare('UPDATE app_sessions SET login_at=?,expires_at=? WHERE id=?').run(new Date(Date.now()-48*3600000).toISOString(),new Date(Date.now()+48*3600000).toISOString(),me.sessionId);assert.equal((await request('me')).status,401);
sqlite.prepare('UPDATE app_sessions SET login_at=?,expires_at=? WHERE id=?').run(dailySession.login_at,dailySession.expires_at,me.sessionId);

assert.equal((await request('users',{id:me.user.id,name:'Test owner',email:'owner@example.test',active:false})).status,409);
assert.equal((await request('users',{name:'Other',email:'other@example.test',pin:'735189'},'', 'https://evil.test')).status,403);
good(await request('users',{id:me.user.id,name:'Test owner',email:'owner@example.test',pin:'649281',active:true}));assert(!good(await request('me')).user.needsPin);
assert.equal((await request('users',{name:'Editor',email:'editor@example.test',role:'editor',pin:'123456'})).status,400);
assert.equal((await request('users',{name:'Admin two',email:'admin2@example.test',role:'admin',pin:'123456'})).status,400);
assert.equal((await request('users',{name:'No PIN',email:'nopin@example.test'})).status,400);
assert.equal((await request('users',{name:'Bad PIN',email:'badpin@example.test',pin:'1234'})).status,400);
good(await request('users',{name:'Test user',email:'staff@example.test',pin:'735189'}),201);
let staff=good(await request('users')).users.find(u=>u.email==='staff@example.test');assert.equal(staff.role,'user');assert.equal(staff.has_pin,1);assert(!('pin_hash' in staff));
const stored=sqlite.prepare('SELECT pin_hash FROM users WHERE id=?').get(staff.id).pin_hash;assert(stored.startsWith('pbkdf2:100000:'));assert(!stored.includes('735189'));
// Preserve all rule/request invariants under PIN-authenticated sessions.
const base={...domain.newInput(),selectedDiseases:['Diabetes Mellitus','Hypertension']};
assert.throws(()=>domain.parseInput(base),/required/);assert.throws(()=>domain.parseInput({...base,isOnMetformin:'false'}),/Yes or No/);
assert.equal((await request('requests',{input:base,clientKey:'missing',checks:{recentResults:true,monitoring:true}})).status,400);
base.isOnMetformin=true;const input=domain.parseInput(base),list=domain.calculate(input);assert.equal(list.length,8);assert.equal(new Set(list.map(t=>t.testName)).size,8);assert.equal(list.find(t=>t.testName==='HbA1c').frequencies.length,2);
const prepared=good(await request('requests',{input,clientKey:'request-one',checks:{recentResults:true,monitoring:true},tests:['INJECTED TEST']}),201).request;assert(!prepared.tests.includes('INJECTED'));assert.equal(JSON.parse(prepared.tests).length,8);
assert.equal(good(await request('requests',{input,clientKey:'request-one',checks:{recentResults:true,monitoring:true}})).request.id,prepared.id);assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM test_requests').get().n,1);
assert.equal((await request('requests',{input:{...input,isOnMetformin:false},clientKey:'request-one',checks:{recentResults:true,monitoring:true}})).status,409);
assert.equal((await request('requests',{operation:'confirm',id:prepared.id,attested:true,tests:['INJECTED']})).status,400);
const confirmed=good(await request('requests',{operation:'confirm',id:prepared.id,attested:true,tests:['HbA1c','U&Es']})).request;assert.equal(confirmed.status,'staff_confirmed');assert.deepEqual(JSON.parse(confirmed.confirmed_tests),['HbA1c','U&Es']);assert(confirmed.prepared_at&&confirmed.confirmed_at);
good(await request('requests',{operation:'confirm',id:prepared.id,attested:true,tests:['HbA1c']}));assert.equal(sqlite.prepare("SELECT COUNT(*) n FROM audit_events WHERE event='request_confirmed'").get().n,1);
const template={...domain.promptTemplates[0],title:'Test monitoring notice',status:'published',conditions:['Hypertension']};let prompt=good(await request('prompts',template)).prompt;assert.equal(prompt.revision,1);
// A user signs in on an anonymous shared PC without a ChatGPT identity.
identity=null;browserKey='staff-browser';assert.equal((await request('me')).status,401);
assert.equal((await request('auth',{operation:'login',email:'staff@example.test',pin:'735189'},'', 'https://evil.test')).status,403);
assert.equal((await request('auth',{operation:'login',email:'staff@example.test',pin:'000000'})).status,401);
const bad=await request('auth',{operation:'login',email:'unknown@example.test',pin:'000000'});assert.equal(bad.status,401);assert.match(bad.data.error,/Email or PIN/);
good(await request('auth',{operation:'login',email:'STAFF@example.test',pin:'735189'}));assert.equal(good(await request('me')).user.role,'user');
assert.equal((await request('users')).status,403);assert.equal((await request('settings',{guidance:'Changed'})).status,403);assert.equal((await request('prompts',template)).status,403);assert.equal((await request('prompts',{operation:'delete',id:prompt.id,revision:prompt.revision})).status,403);assert.equal((await request('prompts',undefined,'?manage=1')).status,403);assert.equal((await request('activity')).status,403);
assert.equal((await request('requests',{operation:'confirm',id:prepared.id,attested:true,tests:['HbA1c']})).status,404);
assert(good(await request('prompts')).prompts.some(p=>p.id===prompt.id));good(await request('prompts',{operation:'acknowledge',id:prompt.id,revision:1}));
const staffToken=jar().get('hgp-session').value;assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM app_sessions WHERE token_hash=?').get(staffToken).n,0,'Raw cookie token is not stored in D1');
// Forgot-login creates an admin queue entry only, never a login or an email.
browserKey='forgot-browser';assert.equal((await request('auth',{operation:'forgot',contact:'Test user'},'', 'https://evil.test')).status,403);
good(await request('auth',{operation:'forgot',contact:'staff@example.test'}));good(await request('auth',{operation:'forgot',contact:'staff@example.test'}));assert.equal((await request('me')).status,401);
assert.equal(sqlite.prepare("SELECT COUNT(*) n FROM login_reset_requests WHERE status='pending'").get().n,1);
// Reset revokes other sessions; the old PIN stops working immediately.
browserKey='owner-browser';let adminData=good(await request('users'));assert.equal(adminData.resets.length,1);
good(await request('users',{id:staff.id,name:staff.name,email:staff.email,pin:'918273',active:true}));assert.equal(good(await request('users')).resets.length,0);
browserKey='staff-browser';assert.equal((await request('me')).status,401);assert.equal((await request('auth',{operation:'login',email:staff.email,pin:'735189'})).status,401);good(await request('auth',{operation:'login',email:staff.email,pin:'918273'}));
// Cookies cleared by the overnight PC wipe do not delete the backend account.
jars.get(browserKey).clear();assert.equal((await request('me')).status,401);good(await request('auth',{operation:'login',email:staff.email,pin:'918273'}));assert.equal(good(await request('me')).user.id,staff.id);
// Expiry, deactivation and logout invalidate access on the server.
sqlite.prepare('UPDATE app_sessions SET expires_at=? WHERE id=?').run('2000-01-01T00:00:00Z',good(await request('me')).sessionId);assert.equal((await request('me')).status,401);good(await request('auth',{operation:'login',email:staff.email,pin:'918273'}));
browserKey='owner-browser';good(await request('users',{id:staff.id,name:staff.name,email:staff.email,active:false}));browserKey='staff-browser';assert.equal((await request('me')).status,401);assert.equal((await request('auth',{operation:'login',email:staff.email,pin:'918273'})).status,401);
browserKey='owner-browser';good(await request('users',{id:staff.id,name:staff.name,email:staff.email,active:true}));
// Throttle unknown accounts as well as existing accounts.
browserKey='rate-browser';for(let i=0;i<5;i++)assert.equal((await request('auth',{operation:'login',email:'rate@example.test',pin:'123456'})).status,401);assert.equal((await request('auth',{operation:'login',email:'rate@example.test',pin:'123456'})).status,429);
for(let i=0;i<3;i++)good(await request('auth',{operation:'forgot',contact:'Rate test'}));assert.equal((await request('auth',{operation:'forgot',contact:'Rate test'})).status,429);
browserKey='owner-browser';prompt=good(await request('prompts',{...prompt,body:'Updated instructions'})).prompt;assert.equal(prompt.revision,2);
assert.equal((await request('prompts',{operation:'delete',id:prompt.id,revision:1})).status,409);
assert.equal((await request('prompts',{operation:'delete',id:'missing-popup',revision:1})).status,404);
let disposable=good(await request('prompts',{...template,id:'',title:'Archive and delete test'})).prompt;
disposable=good(await request('prompts',{...disposable,status:'archived'})).prompt;assert.equal(disposable.status,'archived');assert(good(await request('prompts',undefined,'?manage=1')).prompts.some(p=>p.id===disposable.id));
good(await request('prompts',{operation:'delete',id:disposable.id,revision:disposable.revision}));assert(!good(await request('prompts',undefined,'?manage=1')).prompts.some(p=>p.id===disposable.id));
good(await request('prompts',{operation:'delete',id:prompt.id,revision:prompt.revision}));assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM prompt_acknowledgements WHERE prompt_id=?').get(prompt.id).n,0);assert.equal(sqlite.prepare("SELECT COUNT(*) n FROM audit_events WHERE event='prompt_deleted'").get().n,2);

assert.equal(good(await request('activity',undefined,'?kind=requests&test=HbA1c')).total,1);assert.equal(good(await request('activity',undefined,'?kind=requests&test=unlikely')).total,0);
const csv=good(await request('activity',undefined,'?kind=requests&format=csv'));assert(csv.includes('Test owner'));assert(csv.includes('HbA1c'));assert(csv.includes('staff_confirmed'));
assert.equal((await request('requests',{input:{...domain.newInput(),selectedDiseases:['Learning Disability']},clientKey:'unmapped',checks:{recentResults:true,monitoring:true}})).status,400);
// The simplified UI logs reviewed/copied results without save or clinical attestations.
assert.equal((await request('requests',{operation:'view',input:{...base,isOnMetformin:null},clientKey:'view-incomplete'})).status,400);
const viewed=good(await request('requests',{operation:'view',input,clientKey:'view-one',tests:['INJECTED TEST']}),201).request;
assert.equal(viewed.status,'viewed');assert.equal(viewed.confirmed_at,null);assert.equal(viewed.confirmed_tests,null);assert.equal(JSON.parse(viewed.tests).length,8);assert(!viewed.tests.includes('INJECTED'));
assert.equal(good(await request('requests',{operation:'view',input,clientKey:'view-one'})).request.id,viewed.id);
assert.equal(sqlite.prepare("SELECT COUNT(*) n FROM audit_events WHERE event='request_viewed'").get().n,1,'Review and copy of the same snapshot must not duplicate the activity record');
assert.equal((await request('requests',{operation:'view',input:{...input,isOnMetformin:false},clientKey:'view-one'})).status,409);
const anotherView=good(await request('requests',{operation:'view',input,clientKey:'view-two'}),201).request;assert.notEqual(anotherView.id,viewed.id);assert.equal(anotherView.session_id,me.sessionId);
assert(good(await request('activity',undefined,'?kind=requests')).rows.some(r=>r.id===viewed.id&&r.status==='viewed'));
let scenarios=0;
for(const disease of rules.diseases)for(const stage of ['3a','3b','4','5'])for(let flags=0;flags<16;flags++){const state={selectedDiseases:[disease.name],ckdStage:stage,isOnDOAC:!!(flags&1),isOnLithium:!!(flags&2),isOnAntipsychotics:!!(flags&4),isOnMetformin:!!(flags&8)};const validated=domain.parseInput(state);assert.equal(JSON.stringify(domain.calculate(validated)),JSON.stringify(rules.calculateRequiredTests({...state,selectedDiseases:new Set(state.selectedDiseases)})));scenarios++;}
for(const [answers,score,positive] of [[[0,0,0],0,false],[[0,2,2],4,false],[[1,2,2],5,true],[[2,2,3],7,true],[[2,3,3],8,true],[[3,3,4],10,true],[[3,4,4],11,true],[[4,4,4],12,true]]){const result=domain.auditScore(answers);assert.equal(result.score,score);assert.equal(result.positive,positive);}
assert.equal(domain.auditScore([null,0,0]),null);assert.equal(domain.auditScore([5,0,0]),null);assert.equal(domain.drinkUnits(1,175,12),2.1);assert.equal(domain.drinkUnits(1,25,40),1);assert.equal(domain.drinkUnits(2,568,4),4.544);assert.equal(domain.unitsBand(4.5),2);
good(await request('logout',{}));assert.equal(sqlite.prepare("SELECT COUNT(*) n FROM audit_events WHERE event='logout'").get().n,1);
console.log(`Passed ${checks} API checks and ${scenarios} source-rule comparisons, plus daily UK midnight/GMT/BST expiry, persistent login cookies, PIN login/reset/expiry/permissions, AUDIT-C boundaries and unit conversion. Tests use isolated in-memory SQLite and synthetic identities only.`);
