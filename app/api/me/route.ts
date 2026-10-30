import { api,ok,guidance } from '../../lib/server';
import { GUIDE_VERSION } from '../../lib/rules';
export const dynamic='force-dynamic';
export async function GET(request:Request){return api(request,'user',async actor=>ok({user:{id:actor.id,name:actor.name,email:actor.email,role:actor.role,needsPin:!actor.pin_hash},sessionId:actor.sessionId,sessionExpiresAt:actor.sessionExpiresAt,guideVersion:GUIDE_VERSION,guidance:await guidance()}));}
