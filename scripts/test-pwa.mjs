import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const manifest=JSON.parse(readFileSync('public/manifest.webmanifest','utf8'));
assert.equal(manifest.display,'standalone');assert.equal(manifest.start_url,'/');assert.equal(manifest.prefer_related_applications,false);
for(const icon of manifest.icons){const png=readFileSync('public'+icon.src);assert.equal(png.readUInt32BE(16)+'x'+png.readUInt32BE(20),icon.sizes);}
const handlers={},stored=[],deleted=[],offline=new Response('Public offline notice'),online=new Response('Live response');
let networkFails=false,claimed=false;
const context={self:{location:{origin:'https://hgp.test'},addEventListener:(type,fn)=>handlers[type]=fn,skipWaiting:async()=>{},clients:{claim:async()=>{claimed=true;}}},caches:{open:async()=>({add:async url=>stored.push(url)}),keys:async()=>['hgp-public-offline-v0','hgp-public-offline-v1','another-app-cache'],delete:async key=>deleted.push(key),match:async url=>url==='/offline.html'?offline:undefined},fetch:async()=>{if(networkFails)throw new Error('offline');return online;},URL,Response};
vm.runInNewContext(readFileSync('public/sw.js','utf8'),context);
let pending;handlers.install({waitUntil:p=>pending=p});await pending;assert.deepEqual(stored,['/offline.html'],'Never pre-cache clinical pages or API data');
handlers.activate({waitUntil:p=>pending=p});await pending;assert.deepEqual(deleted,['hgp-public-offline-v0']);assert(claimed);
for(const url of ['/api/me','/api/requests','/api/users']){let intercepted=false;handlers.fetch({request:{method:'GET',mode:'cors',url:'https://hgp.test'+url},respondWith:()=>intercepted=true});assert.equal(intercepted,false);}
let response;const navigation=()=>handlers.fetch({request:{method:'GET',mode:'navigate',url:'https://hgp.test/'},respondWith:p=>response=p});navigation();assert.equal(await response,online);networkFails=true;navigation();assert.equal(await response,offline);
console.log('Passed PWA manifest/icon checks, online navigation, public offline fallback, cache cleanup and private API cache exclusion.');
