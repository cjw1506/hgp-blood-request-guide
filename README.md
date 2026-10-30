> **Moving this app to your Cloudflare account? Read [START_HERE.md](START_HERE.md) first.**

# HGP Blood Request Guide

Harwood Group Practice blood-request calculator, running on Cloudflare Workers and Cloudflare D1 through Sites. Clinical rules are deterministic and extracted from the supplied application.

## User experience

Users sign in with an administrator-issued email address and six-digit PIN. They see the full-width blood-request workspace and AUDIT-C, without admin navigation, activity or guidance buttons. Medication and CKD questions require explicit answers. Source timings/reasons are preserved and tests deduplicated. There is no ICE or EMIS connection. Reviewing or copying a matched list records calculator use automatically, with no save-prepared-list or ICE-confirmation step. This does not claim tests were entered in ICE.

No patient identifiers should be entered. AUDIT-C answers stay in component memory and are not saved. Clinical timing rules, local ICE names and reminder templates need practice approval before clinical use. Learning Disability has no supplied test mapping; the app does not invent one.

## Administrator

There is one existing administrator. Everyone added through Users is a user; there is no editor role or administrator-selection dropdown.

For initial PIN setup or administrator recovery, choose **Administrator setup / recovery** on the login page and sign in with the original Site owner's ChatGPT account. This optional recovery route verifies the existing administrator's stored, Site-specific authentication ID. It cannot create an administrator or promote another account. Then open Users, edit your administrator account and set a PIN. Subsequent everyday sign-ins use email and PIN.

In Users, add names, emails and six-digit PINs, deactivate users, correct emails and reset PINs. PIN hashes cannot be viewed; give new PINs directly to staff. Setting a PIN closes the user's other active sessions and resolves matching pending reset requests. The current administrator session stays open when setting their own PIN.

**Forgot login details?** accepts a name or email and adds a pending item to the administrator's Users screen. It does not send an email, reveal whether an account exists, change a PIN or grant access. The administrator verifies the request and supplies details or a new PIN manually.

Popups and logs are admin-only. The popup builder supports drafts, publish/archive/delete, condition/login/review triggers, schedules, checklists, revision acknowledgements and optional helper actions. Reminder templates do not add tests automatically. Login and usage logs preserve staff identity, viewed test lists and timestamps; historical prepared/confirmed records remain readable; CSV export uses UK date filters and UTC timestamps.

## Shared NHS PCs

Accounts, reset requests, popups and logs are durable in D1. Overnight browser wipes do not delete backend accounts or logs. Authentication uses a persistent HttpOnly/Secure cookie that expires at the next midnight in Europe/London, with the same server-side cutoff. Closing and reopening the app/browser within that day keeps the same session, unless the browser clears its cookies. GMT/BST transitions are handled. Signing out ends the session. Unsaved calculator selections are memory-only; sessionStorage contains only notice IDs for the current session. An open app returns to sign-in at midnight and checks the session again when it regains focus. Signing out, a PIN reset or deactivation ends access sooner.

The hosting entry page is accessible without ChatGPT so staff can reach the email/PIN form. All calculator-data APIs, requests, user management, notices and logs require an app session; admin endpoints additionally require the administrator role. Public visitors can only submit login/help forms. No public registration exists.

PINs use per-account random salts and PBKDF2-SHA256, 100,000 iterations. Session cookie tokens are random and only their SHA-256 hashes are stored. Login attempts are limited to five per email per 15 minutes; reset requests to three per contact per 15 minutes. State-changing requests require the same Origin. No PINs or raw session tokens appear in logs or API responses.

## Source and validation

- app/lib/rules.ts: preserved source rules, source-version hash and original licence notice.
- app/lib/auth.ts and app/api/auth/route.ts: PIN and owner-recovery authentication.
- app/api/: role-checked D1 APIs.
- db/schema.ts and drizzle/: database schema and versioned migrations.
- .openai/hosting.json: preserve the existing Site ID and DB binding.

No original Supabase credentials, login database or passwords are imported. No analytics SDK is included. Nunito uses Google Fonts with system fallbacks.

Use Node.js 22.13 or later and the supported Sites installation/build/publication helpers. Checks:

```sh
node node_modules/typescript/bin/tsc --noEmit --pretty false
node --disable-warning=ExperimentalWarning scripts/test-app.mjs
```

The isolated test harness applies real migrations to in-memory SQLite with synthetic identities. It covers anonymous rejection, owner recovery, PIN authentication, permissions, reset queues, session revocation/expiry, PC cookie wipes, request lifecycles, 896 source-rule comparisons, AUDIT-C boundaries and conversion. It never uses deployed data.

Production publication applies migrations through Sites. For local D1, build once and use Wrangler with dist/server/wrangler.json and .wrangler/state to apply only pending SQL files. Never replay applied migrations or package local database state. Managed local preview cannot simulate the optional hosting-owned owner-recovery sign-in; normal email/PIN flows use the real app session system.

The light UI uses white condition tiles with blue icons, orange selections/actions, blue required-question headers, and distinct labelled frequency colours. AUDIT-C answer selections follow the same orange/blue convention; its result colours indicate the stated screening band. Delete in the popup builder requires confirmation, removes the popup and acknowledgements atomically, and retains an audit event. Archive remains available.

The old staged save/confirmation UI is removed. Background usage records are server-recalculated and idempotent per selection snapshot; opening Review tests and copying the same snapshot create only one record. Incomplete required answers are rejected. Older API operations remain compatible with already-open older clients; their existing records are retained.

A visible reminder beneath valid results asks staff to check medication monitoring and the GM | CVNeed Reviews Incomplete hover description in the EMIS QOF box. The non-exhaustive medicine examples were checked against linked NHS SPS pages on 30 October 2026. They distinguish ACE/ARB renal/electrolyte checks from statin lipid/liver checks, include DOAC FBC/LFT/renal review, DMARD shared care and levothyroxine TSH monitoring. They do not add tests or impose generic intervals. Current individual and local/shared-care plans determine what is due.

Urine ACR shares the standard results grid/card and timing/reasons disclosure, with a subtle gold border. CVNeed is the first always-visible results reminder, including a practice-plan check for FBC, LFTs and U&Es. Medication examples and sources are in a compact expandable reference below the visible medication warning; the DOAC examples include apixaban, rivaroxaban, edoxaban and dabigatran.

Optional PWA installation is available via an Install app button where supported; it is never required. The service worker caches only a public offline notice, never authenticated pages or API data. The app requires an internet connection. See [CLOUDFLARE_DEPLOY.md](CLOUDFLARE_DEPLOY.md) for the separate GitHub/Cloudflare account migration workflow and standalone build command. This source snapshot is in cjw1506/hgp-blood-request-guide. No external database transfer has been performed.
