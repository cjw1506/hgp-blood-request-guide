'use client';
import { useEffect,useRef,useId,type ReactNode } from 'react';
import { X,LoaderCircle } from 'lucide-react';
export function Modal({title,onClose,children,wide=false,className=''}:{title:string;onClose:()=>void;children:ReactNode;wide?:boolean;className?:string}){
 const ref=useRef<HTMLDialogElement>(null),id=useId();useEffect(()=>{const d=ref.current;if(d&&!d.open)d.showModal();return()=>{if(d?.open)d.close();};},[]);
 return <dialog ref={ref} className={'modal '+(wide?'modal-wide ':'')+className} aria-labelledby={id} onCancel={e=>{e.preventDefault();onClose();}} onClick={e=>{if(e.target===ref.current)onClose();}}><header className="modal-head"><h2 id={id}>{title}</h2><button type="button" className="icon-button" aria-label={'Close '+title} onClick={onClose}><X/></button></header><div className="modal-content">{children}</div></dialog>;
}
export function ErrorMessage({message}:{message:string}){return message?<p className="error-message" role="alert">{message}</p>:null;}
export function Busy({label='Loading…'}:{label?:string}){return <span className="busy" role="status"><LoaderCircle className="spin"/>{label}</span>;}
export function Empty({title,children}:{title:string;children:ReactNode}){return <div className="empty-state"><h3>{title}</h3><p>{children}</p></div>;}
