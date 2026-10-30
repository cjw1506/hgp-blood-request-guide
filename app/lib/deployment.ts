import { env } from 'cloudflare:workers';
// Self-hosted Workers must never trust the Sites-specific identity headers.
export function ownerRecoveryEnabled(){return env.HGP_SELF_HOSTED!=='1';}
