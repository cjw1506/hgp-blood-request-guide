'use client';
import { useEffect,useRef,useState } from 'react';
import { LayoutDashboard,History,Users as UsersIcon,MessageSquareText,BookOpen,Calculator,LogOut,ChevronRight,ShieldCheck,Check,KeyRound } from 'lucide-react';
import Workspace,{type Gate} from './Workspace';
import AuditCalculator from './AuditCalculator';
import { Users,ActivityLog,PopupBuilder } from './Admin';
import Login from './Login';
import { InstallAppButton } from './Pwa';
import { Modal,Busy,ErrorMessage } from './ui';
import { call,ApiError } from './lib/client';
import { type InputState,type Prompt,newInput } from './lib/domain';
type Me={user:{id:string;name:string;email:string;role:'admin'|'user';needsPin:boolean};sessionId:string;sessionExpiresAt:string;guideVersion:string;guidance:string};
type PopupContext={items:Prompt[];done:()=>void;key:string};
export default function App({allowOwnerRecovery=true}:{allowOwnerRecovery?:boolean}){
 const [loading,setLoading]=useState(true),[me,setMe]=useState<Me|null>(null),[error,setError]=useState(''),[page,setPage]=useState('workspace'),[auditOpen,setAuditOpen]=useState(false),[guidanceOpen,setGuidanceOpen]=useState(false),[available,setAvailable]=useState<Prompt[]>([]),[popup,setPopup]=useState<PopupContext|null>(null),[toast,setToast]=useState('');
 const booted=useRef(false),seen=useRef(new Set<string>()),loginShown=useRef(false);
 async function refreshPrompts(){const data=await call('/api/prompts');setAvailable(data.prompts);}
 async function refreshMe(){try{const data=await call<Me>('/api/me');setMe(data);return data;}catch(e){if(!(e instanceof ApiError&&e.status===401))setError((e as Error).message);setMe(null);return null;}}
 async function loadWorkspace(){const data=await refreshMe();if(!data)return;try{const previous=sessionStorage.getItem('hgp-notices:'+data.sessionId);if(previous)seen.current=new Set(JSON.parse(previous));await refreshPrompts();}catch(e){setError((e as Error).message);}return data;}
 useEffect(()=>{if(booted.current)return;booted.current=true;(async()=>{try{if(new URLSearchParams(window.location.search).get('admin')==='1'){await call('/api/auth',{operation:'owner'});window.history.replaceState(null,'','/');}await loadWorkspace();}catch(e){setError((e as Error).message);}finally{setLoading(false);}})();},[]);

 useEffect(()=>{
  if(!me)return;
  let checking=false;
  const endSession=()=>{setMe(null);setPopup(null);setAuditOpen(false);setGuidanceOpen(false);setPage('workspace');setAvailable([]);seen.current=new Set();loginShown.current=false;setError('Please sign in for today.');};
  const recheck=async()=>{if(document.visibilityState==='hidden'||checking)return;if(Date.now()>=Date.parse(me.sessionExpiresAt)){endSession();return;}checking=true;try{await call('/api/me');}catch{}finally{checking=false;}};
  const timer=window.setTimeout(endSession,Math.max(0,Date.parse(me.sessionExpiresAt)-Date.now()));
  window.addEventListener('hgp-session-ended',endSession);window.addEventListener('focus',recheck);document.addEventListener('visibilitychange',recheck);
  return()=>{window.clearTimeout(timer);window.removeEventListener('hgp-session-ended',endSession);window.removeEventListener('focus',recheck);document.removeEventListener('visibilitychange',recheck);};
 },[me?.sessionId,me?.sessionExpiresAt]);

 function promptKey(p:Prompt,key:string){return p.id+':'+p.revision+':'+(p.frequency==='request'?key:p.frequency==='session'?me?.sessionId:'acknowledged');}
 function gate(stage:'login'|'condition'|'review',input:InputState,key:string,done:()=>void){const matches=available.filter(p=>p.stage===stage&&(!p.conditions.length||p.conditions.some(c=>input.selectedDiseases.includes(c)))&&!seen.current.has(promptKey(p,key)));if(matches.length){setPopup({items:matches,done,key});return;}done();}
 useEffect(()=>{if(!me||!available.length||loginShown.current)return;loginShown.current=true;gate('login',newInput(),'opening',()=>{});},[me,available]);
 async function acknowledge(){if(!popup||!me)return;for(const p of popup.items){await call('/api/prompts',{operation:'acknowledge',id:p.id,revision:p.revision});seen.current.add(promptKey(p,popup.key));}sessionStorage.setItem('hgp-notices:'+me.sessionId,JSON.stringify([...seen.current]));const done=popup.done;setPopup(null);done();}
 async function logout(){try{await call('/api/logout',{});}catch{}window.location.assign('/');}
 if(loading)return <div className="boot-screen"><div className="brand-mark large">HGP</div><Busy label="Opening the guide…"/></div>;
 if(!me)return <Login allowOwnerRecovery={allowOwnerRecovery} initialError={error} onSignedIn={async()=>{setError('');loginShown.current=false;seen.current=new Set();const opened=await loadWorkspace();if(!opened)throw new Error('Could not keep you signed in. Allow cookies for this site, then try again.');}}/>;
 const isAdmin=me.user.role==='admin';
 const nav=[{id:'workspace',label:'Workspace',icon:LayoutDashboard},{id:'users',label:'Users',icon:UsersIcon},{id:'popups',label:'Popups',icon:MessageSquareText},{id:'activity',label:'Logs',icon:History}];

 return <div className={'app-frame '+(isAdmin?'admin-frame':'user-frame')}>{isAdmin&&<aside className="app-sidebar"><div className="brand-mark">HGP</div><nav aria-label="Main navigation">{nav.map(n=><button key={n.id} className={page===n.id?'active':''} aria-current={page===n.id?'page':undefined} onClick={()=>setPage(n.id)}><n.icon/><span>{n.label}</span></button>)}</nav><div className="sidebar-bottom"><ShieldCheck/><span>Staff<br/>workspace</span></div></aside>}<div className="app-main"><header className="app-header"><div className="header-brand"><span>HARWOOD GROUP PRACTICE</span><strong>Blood Request Guide</strong></div><div className="header-actions"><InstallAppButton/><button className="secondary" onClick={()=>setAuditOpen(true)}><Calculator/><span>AUDIT-C</span></button><div className="staff-profile"><div className="avatar">{me.user.name.split(/\s+/).slice(0,2).map(s=>s[0]).join('').toUpperCase()}</div><div><strong>{me.user.name}</strong><span>{isAdmin?'Administrator':'User'}</span></div></div><button className="icon-button" aria-label="Sign out" onClick={logout}><LogOut/></button></div></header>
 <div className="app-content">{isAdmin&&me.user.needsPin&&<div className="notice admin-pin-notice"><KeyRound/><p>Set your administrator PIN in <button className="text-button" onClick={()=>setPage('users')}>Users</button> to use email and PIN next time.</p></div>}<div className="workspace-screen" hidden={page!=='workspace'}><Workspace gate={gate as Gate} onNewRequest={()=>setToast('New request started.')}/></div>{page==='activity'&&isAdmin&&<ActivityLog isAdmin/>} {page==='users'&&isAdmin&&<Users onIdentityChange={refreshMe}/>} {page==='popups'&&isAdmin&&<PopupBuilder isAdmin onChanged={()=>refreshPrompts().catch(e=>setToast(e.message))}/>}</div>
 <footer className="app-status"><span><span className="live-dot"/>Blood request guide</span><span>Source guide <span className="mono">{me.guideVersion.slice(0,8)}</span> · check the documented clinical plan</span></footer></div>
 {error&&<div className="toast error" role="alert">{error}<button aria-label="Dismiss error" onClick={()=>setError('')}>×</button></div>}{toast&&<div className="toast" role="status">{toast}<button aria-label="Dismiss message" onClick={()=>setToast('')}>×</button></div>}
 {auditOpen&&<AuditCalculator onClose={()=>setAuditOpen(false)}/>} {guidanceOpen&&<Modal title="Practice guidance" onClose={()=>setGuidanceOpen(false)}><div className="guidance-text">{me.guidance}</div><button className="primary" onClick={()=>setGuidanceOpen(false)}>Understood</button></Modal>}
 {popup&&<ReminderPopup key={popup.items.map(p=>p.id+':'+p.revision).join(',')} context={popup} acknowledge={acknowledge} onClose={()=>setPopup(null)} onAction={action=>{if(action==='audit')setAuditOpen(true);else setGuidanceOpen(true);}}/>}
 </div>;
}
function ReminderPopup({context,acknowledge,onClose,onAction}:{context:PopupContext;acknowledge:()=>Promise<void>;onClose:()=>void;onAction:(action:string)=>void}){
 const [checked,setChecked]=useState<Set<string>>(new Set()),[busy,setBusy]=useState(false),[error,setError]=useState('');const needed=context.items.flatMap(p=>p.checklist.map((_,i)=>p.id+':'+i));
 return <Modal title={context.items.length===1?context.items[0].title:'Before you continue'} onClose={onClose}><div className="reminder-stack">{context.items.map(p=><article className={'prompt-card '+p.priority} key={p.id}><span className="required-tag">{p.priority==='important'?'Important check':'Practice reminder'}</span>{context.items.length>1&&<h3>{p.title}</h3>}<p>{p.body}</p>{p.checklist.map((item,i)=>{const key=p.id+':'+i;return <label className="check-line" key={key}><input type="checkbox" checked={checked.has(key)} onChange={e=>setChecked(old=>{const next=new Set(old);e.target.checked?next.add(key):next.delete(key);return next;})}/>{item}</label>;})}{p.action!=='none'&&<button className="secondary small" onClick={()=>onAction(p.action)}>{p.action==='audit'?<Calculator/>:<BookOpen/>}{p.action==='audit'?'Open AUDIT-C':p.action==='monitoring'?'Monitoring guidance':'Practice guidance'}<ChevronRight/></button>}</article>)}</div><p className="fine">Check whether updates are needed and record them in EMIS. This app cannot read outstanding EMIS items.</p><ErrorMessage message={error}/><button className="primary" disabled={busy||needed.some(k=>!checked.has(k))} onClick={async()=>{setBusy(true);setError('');try{await acknowledge();}catch(e){setError((e as Error).message);setBusy(false);}}}>{busy?<Busy label="Recording…"/>:<><Check/>Acknowledge & continue</>}</button></Modal>;
}
