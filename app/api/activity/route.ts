import { api,rows,row,ok,dateBoundary,HttpError } from '../../lib/server';
export async function GET(request:Request){return api(request,'admin',async actor=>{
 const q=new URL(request.url).searchParams,kind=q.get('kind')||'requests',values:any[]=[],where:string[]=[];
 if(!['requests','events'].includes(kind))throw new HttpError('Choose a valid log view.');const owner=actor.role==='admin'?q.get('user'):actor.id;
 if(owner){where.push('r.user_id=?');values.push(owner);}
 const field=kind==='requests'?'r.prepared_at':'r.at';if(q.get('from')){where.push(field+'>=?');values.push(dateBoundary(q.get('from')!));}if(q.get('to')){where.push(field+'<?');values.push(dateBoundary(q.get('to')!,true));}
 const needle=(q.get('test')||'').trim().slice(0,100);if(needle&&kind==='requests'){where.push('EXISTS (SELECT 1 FROM json_each(r.tests) jt WHERE json_extract(jt.value,\'$.testName\') LIKE ? ESCAPE \'\\\')');values.push('%'+needle.replace(/[\\%_]/g,'\\$&')+'%');}
 const event=q.get('event');if(event&&kind==='events'){where.push('r.event=?');values.push(event.slice(0,100));}
 const table=kind==='requests'?'test_requests':'audit_events',clause=where.length?' WHERE '+where.join(' AND '):'',count=await row<any>('SELECT COUNT(*) AS total FROM '+table+' r'+clause,...values);
 const page=Math.max(0,Math.min(10000,Number(q.get('page'))||0)),csv=q.get('format')==='csv',limit=csv?5000:50;
 const result=await rows<any>('SELECT r.*,u.name AS staff_name,u.email AS staff_email,s.login_at AS login_at FROM '+table+' r JOIN users u ON u.id=r.user_id LEFT JOIN app_sessions s ON s.id=r.session_id'+clause+' ORDER BY '+field+' DESC LIMIT ? OFFSET ?',...values,limit,csv?0:page*50);
 if(csv){const cell=(v:unknown)=>{let s=String(v??'');if(/^[=+@\-\t\r]/.test(s))s="'"+s;return'"'+s.replace(/"/g,'""')+'"';};const headers=kind==='requests'?['Request ID','Staff','Email','Login (UTC)','Recorded (UTC)','Confirmed (UTC)','Status','Matched tests','Staff-confirmed tests','Guide version','Login session']:['Event ID','Staff','Email','Time (UTC)','Event','Details','Login session'];const lines=result.map(r=>kind==='requests'?[r.id,r.staff_name,r.staff_email,r.login_at,r.prepared_at,r.confirmed_at,r.status,JSON.parse(r.tests).map((t:any)=>t.testName).join('; '),r.confirmed_tests?JSON.parse(r.confirmed_tests).join('; '):'',r.rule_version,r.session_id]:[r.id,r.staff_name,r.staff_email,r.at,r.event,r.details,r.session_id]);return new Response('\ufeff'+[headers,...lines].map(r=>r.map(cell).join(',')).join('\r\n'),{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="hgp-'+kind+'-log.csv"','Cache-Control':'no-store'}});}
 return ok({rows:result,total:count?.total||0,page,pageSize:50});
 });}
