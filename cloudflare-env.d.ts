declare namespace Cloudflare {
  interface Env {
    HGP_SELF_HOSTED?: string;
    DB?: D1Database;
    BUCKET?: R2Bucket;
  }
}
