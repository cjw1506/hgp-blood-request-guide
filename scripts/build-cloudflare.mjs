import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
const databaseId=process.env.CLOUDFLARE_D1_DATABASE_ID;
if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(databaseId||'')||databaseId==='00000000-0000-4000-8000-000000000000')throw new Error('Set CLOUDFLARE_D1_DATABASE_ID to your own Cloudflare D1 database ID.');
const name=process.env.CLOUDFLARE_WORKER_NAME||'hgp-blood-request-guide';
if(!/^[a-z0-9][a-z0-9-]{0,62}$/.test(name))throw new Error('Use a lowercase Worker name with letters, numbers and hyphens.');
if(!process.argv.includes('--prepare-only')){
 const result=spawnSync(process.execPath,['scripts/run-framework.mjs','build'],{stdio:'inherit'});
 if(result.error)throw result.error;
 if(result.status!==0)process.exit(result.status??1);
}
const config=JSON.parse(readFileSync('dist/server/wrangler.json','utf8'));
config.name=name;delete config.topLevelName;
config.vars={...config.vars,HGP_SELF_HOSTED:'1'};
config.d1_databases=[{binding:'DB',database_name:process.env.CLOUDFLARE_D1_DATABASE_NAME||'hgp-blood-request-guide',database_id:databaseId,migrations_dir:'../../drizzle'}];
writeFileSync('dist/server/wrangler.cloudflare.json',JSON.stringify(config,null,2)+'\n');
console.log('Standalone Cloudflare build ready: dist/server/wrangler.cloudflare.json');
