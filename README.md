# Sceney

A local video queue built with Next.js, React, Tailwind CSS, and Zustand. Add files, arrange the order, and switch clips with your keyboard.

## Run locally

Requires Node.js 22.15 or newer. No accounts, API keys, or environment variables are needed.

```sh
npm ci
npm run dev
```

Open [localhost:3000](http://localhost:3000).

## Features

- Upload videos or drop files onto the studio. Files stay in the browser; there is no server upload or cloud storage.
- Drag queue items or use their arrow buttons to reorder them.
- Play clips in sequence, or turn off automatic advance to stop after each clip.
- Press **1–9** to switch to a clip and restart it. Change a clip's key in the queue; reordering preserves its key.
- Press **Space** to play/pause and **← / →** to select the previous/next clip. Typing fields and open dialogs suspend shortcuts. Focused native player controls retain their own Space/arrow behavior.
- The queue clears when the page refreshes or the tab closes. Removing files releases their browser object URLs.

Playback depends on browser codec support. MP4 and WebM are good starting points; MOV support varies by codec and browser.

The dark theme retains its purple palette. Tailwind v4 runs through `@tailwindcss/postcss`; theme and utilities are imported in global CSS without Preflight to preserve the existing reset.

## Release scope

Website imports and accounts are disabled in `src/lib/release-features.ts`. The **Add link** and account controls are hidden, the store rejects links, and the player rejects linked media. The content security policy blocks frames and external media. `/login` and the auth callback redirect to the studio, and Supabase settings cannot activate accounts in this release.

The earlier YouTube/X/Vimeo adapters and Supabase scaffolding remain in source for future development. They are not active features. Website imports are planned for a future paid subscription. There is no payment collection or subscription enforcement yet.

**Release switches are not a paywall.** Before enabling paid features, implement authenticated server-side entitlement checks, verified billing webhooks, and ownership-based database policies where applicable. Review the provider integrations and allow only required origins in the CSP. Merely showing a button or changing a client flag does not enforce paid access.

## Checks and production

```sh
npm run typecheck
npm test
npm run build
npm run verify:release
npm audit
npm start
```

Unit tests cover playback order, reordering, rapid key switching, stale player events, shortcut uniqueness, object URL cleanup, invalid input, isolated stores, and disabled imports/accounts. `verify:release` starts and stops its own production server to check UI visibility, redirects, fresh script nonces, and security headers.

Deploy with a Node.js server and HTTPS. HTML is rendered dynamically for a fresh CSP nonce on every request and must not be put in a shared HTML cache. Static export is not supported by this configuration. No database is required.

See [SECURITY.md](SECURITY.md) for the current security scope and credential handling.

## Key files

```text
src/components/workspace.tsx       Studio, file input, and keyboard controls
src/components/video-player.tsx    Native video playback and dormant embeds
src/components/video-queue.tsx     Ordering and shortcut controls
src/stores/video-store.ts          Shared queue and playback state
src/lib/release-features.ts        Disabled future features
src/lib/security-headers.ts        Content security policy and response headers
src/proxy.ts                      Per-request CSP nonce
src/app/globals.css                Tailwind imports and responsive theme
tests/                            State and release regression tests
scripts/verify-release.mjs         Production HTTP checks
```
