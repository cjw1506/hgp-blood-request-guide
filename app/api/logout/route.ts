import { cookies } from 'next/headers';
import { api,db,now,audit,ok } from '../../lib/server';
export async function POST(request:Request){return api(request,'user',async actor=>{await db().prepare('UPDATE app_sessions SET ended_at=? WHERE id=? AND user_id=?').bind(now(),actor.sessionId,actor.id).run();await audit(actor,'logout');(await cookies()).delete('hgp-session');return ok({ok:true});});}
