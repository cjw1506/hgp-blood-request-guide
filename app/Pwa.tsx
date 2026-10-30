'use client';
import { createContext,useContext,useEffect,useState,type ReactNode } from 'react';
import { Download } from 'lucide-react';
import { Modal } from './ui';
type InstallPrompt=Event&{prompt:()=>Promise<void>;userChoice:Promise<{outcome:'accepted'|'dismissed'}>};
type InstallState={prompt:InstallPrompt|null;installed:boolean;ios:boolean;clearPrompt:()=>void};
const InstallContext=createContext<InstallState>({prompt:null,installed:true,ios:false,clearPrompt:()=>{}});
export function PwaProvider({children}:{children:ReactNode}){
 const [prompt,setPrompt]=useState<InstallPrompt|null>(null),[installed,setInstalled]=useState(true),[ios,setIos]=useState(false);
 useEffect(()=>{
  const display=window.matchMedia('(display-mode: standalone)');
  const update=()=>setInstalled(display.matches||!!(navigator as Navigator&{standalone?:boolean}).standalone);
  update();setIos(/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1));
  const offer=(event:Event)=>{event.preventDefault();setPrompt(event as InstallPrompt);};
  const completed=()=>{setInstalled(true);setPrompt(null);};
  window.addEventListener('beforeinstallprompt',offer);window.addEventListener('appinstalled',completed);display.addEventListener('change',update);
  if('serviceWorker' in navigator)navigator.serviceWorker.register('/sw.js',{updateViaCache:'none'}).catch(()=>{});
  return()=>{window.removeEventListener('beforeinstallprompt',offer);window.removeEventListener('appinstalled',completed);display.removeEventListener('change',update);};
 },[]);
 return <InstallContext.Provider value={{prompt,installed,ios,clearPrompt:()=>setPrompt(null)}}>{children}</InstallContext.Provider>;
}
export function InstallAppButton(){
 const {prompt,installed,ios,clearPrompt}=useContext(InstallContext),[help,setHelp]=useState(false),[busy,setBusy]=useState(false);
 if(installed||(!prompt&&!ios))return null;
 return <><button type="button" className="secondary pwa-install-button" disabled={busy} onClick={async()=>{if(!prompt){setHelp(true);return;}setBusy(true);try{await prompt.prompt();await prompt.userChoice;}catch{setHelp(true);}finally{clearPrompt();setBusy(false);}}}><Download aria-hidden="true"/><span>Install app</span></button>{help&&<Modal title="Install the guide" onClose={()=>setHelp(false)}><p className="muted">Installation is optional. You can keep using this guide in your browser.</p><p className="fine">On iPhone or iPad, open this page in Safari, tap Share, then Add to Home Screen. On a desktop, use your browser’s Install app option when available.</p><button type="button" className="primary popup-close-button" onClick={()=>setHelp(false)}>Close</button></Modal>}</>;
}
