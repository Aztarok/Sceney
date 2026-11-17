# Security scope

This release plays local files in the browser. It does not upload files, fetch arbitrary URLs on a server, connect to Supabase, or accept payments. Accounts and website imports are disabled regardless of environment settings.

## Current protections

- Production scripts require a fresh per-response CSP nonce. Frames, external media, plugins, and external network connections are blocked by the policy. Local video uses `blob:` URLs.
- Clickjacking, MIME sniffing, and referrer protections are set in response headers. Camera, microphone, geolocation, and payment permissions are disabled.
- HTML responses are private and not stored in shared caches. Development permits script evaluation and local WebSockets for Next.js tooling; use a production build for deployment.
- File names and notices render as React text. Untrusted HTML is not inserted into the app.
- Removing or clearing local files revokes their object URLs. Files and queue state are not persisted.

Style attributes remain allowed for the existing UI. A CSP reduces exposure but is not a guarantee of security. This project has not had an independent security audit. Keep the lockfile current, run `npm audit`, and rerun the release checks after changes.

## Credentials and deployment

No credentials are required. `.env*` files are ignored except the blank `.env.example`. Never commit tokens, private keys, local media, or service-role credentials. `NEXT_PUBLIC_` variables are visible to browser users and must never contain secrets.

Use HTTPS in production. Do not override the response CSP or cache dynamic HTML at a shared proxy/CDN. Only run `next dev` for local development.

## Before enabling subscriptions

Release switches hide unfinished features; they do not authorize users. Paid imports require server-verified sessions and entitlements. Verify billing webhook signatures, make billing updates idempotent, and enforce ownership policies before storing user data. Review auth flows and third-party origins before changing the restrictive CSP. No subscription mechanism is implemented in this release.
