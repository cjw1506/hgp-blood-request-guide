# GitHub and your own Cloudflare account

The current live app already runs on Workers and D1 through Sites. These steps move hosting into your own Cloudflare account. The Sites Git repository remains the source for the currently hosted app; do not change its remote or Site ID.

## Repository

Choose a new private GitHub repository, for example `hgp-blood-request-guide`, or explicitly choose an existing destination. Copy the tracked project source into it, including `pnpm-lock.yaml`, `drizzle/`, `public/`, `scripts/` and `worker/`. Exclude `node_modules`, `dist`, runtime state, local databases and environment/secret files; the provided `.gitignore` covers those. Preserve existing licence notices. Never overwrite one of the older bloods repositories without selecting it first.

## Initial deployment

1. Use Node.js 22.13+ and the pinned pnpm version in `package.json`. Install dependencies with `pnpm install --frozen-lockfile`.
2. Create a D1 database in your Cloudflare account, named `hgp-blood-request-guide`, and note its ID.
3. Set the build environment variable `CLOUDFLARE_D1_DATABASE_ID` to that ID. Optional overrides: `CLOUDFLARE_D1_DATABASE_NAME` and `CLOUDFLARE_WORKER_NAME`; both otherwise use `hgp-blood-request-guide`.
4. Build with `pnpm run build:cloudflare`. This preserves the normal Sites build and writes a separate `dist/server/wrangler.cloudflare.json` for your own account. Do not deploy the unmodified generated `wrangler.json`, which has the Sites placeholder database ID.
5. For a fresh empty database only, apply the schema:

   ```sh
   pnpm exec wrangler d1 migrations apply DB --remote --config dist/server/wrangler.cloudflare.json
   ```

6. Before staff cutover, transfer the existing users (with PIN hashes), prompts, settings and logs securely, or initialise a new single administrator with a freshly generated salted PIN hash. This is a separate database operation, not part of a Git push. The current admin record/PIN must be verified in the new database before going live. Do not transfer active sessions; everyone signs in again on the new URL. Do not put database exports or credentials in Git.
7. Deploy with `pnpm run deploy:cloudflare`, then check email/PIN login, admin-only screens, reminders, request logging, optional installation and logout on the new HTTPS URL before switching staff over.

Database transfer and initial admin setup have not been performed by preparing these files. An existing/imported database needs its applied migrations reconciled before running migration commands; never replay schema migrations over existing tables. Keep the old app available until the new app and data are verified.

The standalone configuration sets `HGP_SELF_HOSTED=1`. This disables the Sites-specific owner-recovery endpoint and hides its link, so client-supplied Sites identity headers cannot grant administrator access. Administrator recovery in your own account must be done through a trusted D1 administration workflow. Ordinary staff and administrator email/PIN login works as before. There is no public registration.

## Automatic deployment after Git pushes

In Cloudflare Workers Builds, connect the selected GitHub repository and choose its production branch. The Worker name in the dashboard must match `CLOUDFLARE_WORKER_NAME` (default `hgp-blood-request-guide`). Set:

- Build command: `pnpm run build:cloudflare`
- Deploy command: `pnpm run deploy:cloudflare`
- Build variable: `CLOUDFLARE_D1_DATABASE_ID`
- Node version: 22.13 or newer

Cloudflare manages its Git integration/deploy credentials. Database schema changes still need a deliberate pending-migration step; a code push does not transfer or reset the database.

Official references:
- https://developers.cloudflare.com/workers/ci-cd/builds/git-integration/
- https://developers.cloudflare.com/workers/ci-cd/builds/configuration/
- https://developers.cloudflare.com/d1/wrangler-commands/

## Optional PWA and daily login

The web app remains usable in the browser. Where supported, the **Install app** button opens the browser's install dialog only when clicked. Installation is never required. Browser/organisation settings can hide installation. The manifest, icons and public offline notice are served locally; an internet connection is needed for app functionality. The service worker never stores authenticated pages or API results.

The HttpOnly, Secure session cookie persists until the next midnight in Europe/London. Server checks enforce the same deadline, including GMT/BST changes; reopening within the same browser profile that day does not create another login. An open app returns to sign-in at expiry and rechecks when it regains focus. Signing out, account deactivation, a PIN reset, browser-data clearing or the overnight NHS PC wipe can require an earlier sign-in. Unsaved selections remain memory-only.
