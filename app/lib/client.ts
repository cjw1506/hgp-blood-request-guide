export class ApiError extends Error{constructor(message:string,public status:number){super(message);}}
export async function call<T=any>(path:string,body?:unknown):Promise<T>{
 const response=await fetch(path,{method:body===undefined?'GET':'POST',credentials:'same-origin',headers:body===undefined?undefined:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
 let data:any;try{data=await response.json();}catch{throw new Error('The server returned an unexpected response. Please refresh and try again.');}
 if(!response.ok){if(response.status===401&&typeof window!=='undefined')window.dispatchEvent(new Event('hgp-session-ended'));throw new ApiError(data.error||'The action could not be completed.',response.status);}return data;
}
export const time=(value:string|null|undefined)=>value?new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',dateStyle:'medium',timeStyle:'medium'}).format(new Date(value)):'—';
export async function copy(text:string){await navigator.clipboard.writeText(text);}
