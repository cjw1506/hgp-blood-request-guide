# Start here when you are home

The complete HGP Blood Request Guide source is now in this repository. You do not need to copy anything from the NHS PC.

## The easiest next step

Open the same ChatGPT conversation on your home PC and say:

> The app is in cjw1506/hgp-blood-request-guide. Help me deploy it to my own Cloudflare account, including setting up D1 and moving my administrator login, users and popups.

Have your Cloudflare account available. Keep using the existing app while the replacement is set up and tested.

Current live app: https://hgp-blood-request-guide.lowerpolewalk.chatgpt.site/

## What is already included

- The current light-theme app, admin screens, email/PIN login, popups and AUDIT-C.
- Optional PWA installation and daily login expiry at midnight UK time.
- The Cloudflare build command, schema migrations and validation scripts.
- Detailed technical steps in [CLOUDFLARE_DEPLOY.md](CLOUDFLARE_DEPLOY.md).

## What still needs doing

Create a D1 database in your Cloudflare account, connect this repository to a Worker, and transfer or initialise the administrator and other required records. The database is separate from this source code: it has not been copied into GitHub. Login credentials and active sessions are not included in this repository.

Cloudflare build settings after the database exists:

| Setting | Value |
| --- | --- |
| Production branch | `main` |
| Build command | `pnpm run build:cloudflare` |
| Deploy command | `pnpm run deploy:cloudflare` |
| Build variable | `CLOUDFLARE_D1_DATABASE_ID` = your new D1 ID |
| Worker name | `hgp-blood-request-guide` |
| Node.js | 22.13 or newer |

Do not switch staff to the new address until login, reminders, results and logging have been checked. You can add a custom domain afterwards.
