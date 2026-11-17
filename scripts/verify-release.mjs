// Exercise the built app over HTTP. Run `npm run build` first.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { once } from "node:events";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";

const root = fileURLToPath(new URL("../", import.meta.url));
const probe = createServer();
probe.listen(0, "127.0.0.1");
await once(probe, "listening");
const port = probe.address().port;
await new Promise((resolve, reject) =>
  probe.close((error) => (error ? reject(error) : resolve())),
);
// NextRequest normalizes loopback URLs to localhost.
const origin = `http://localhost:${port}`;
const server = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "start",
    "--hostname",
    "127.0.0.1",
    "--port",
    String(port),
  ],
  {
    cwd: root,
    env: {
      ...process.env,
      NODE_ENV: "production",
      NEXT_TELEMETRY_DISABLED: "1",
      NEXT_PUBLIC_SUPABASE_URL: "https://unused.example.invalid",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "test-publishable-placeholder",
    },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  },
);
let output = "";
server.stdout.on("data", (data) => {
  output = (output + data).slice(-4000);
});
server.stderr.on("data", (data) => {
  output = (output + data).slice(-4000);
});
const closed = once(server, "close");
void closed.catch(() => {});

function checkHeaders(response) {
  const csp = response.headers.get("content-security-policy") ?? "";
  const nonce = csp.match(/'nonce-([^']+)'/)?.[1];
  assert.ok(nonce, "a fresh CSP nonce is required");
  assert.ok(!csp.includes("'unsafe-eval'"), "production must not allow eval");
  for (const directive of [
    "media-src blob:",
    "connect-src 'self'",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ]) {
    assert.ok(csp.split("; ").includes(directive), `missing ${directive}`);
  }
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("x-frame-options"), "DENY");
  assert.equal(response.headers.get("referrer-policy"), "no-referrer");
  assert.equal(response.headers.get("x-powered-by"), null);
  assert.match(response.headers.get("cache-control") ?? "", /no-store/);
  return nonce;
}

try {
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (server.exitCode !== null)
      throw new Error(`Production server exited: ${output}`);
    try {
      const response = await fetch(origin, {
        signal: AbortSignal.timeout(1000),
      });
      await response.body?.cancel();
      if (response.ok) {
        ready = true;
        break;
      }
    } catch {
      /* The server is still starting. */
    }
    await delay(200);
  }
  assert.ok(ready, `Production server did not become ready: ${output}`);
  const response = await fetch(origin, {
    headers: {
      "x-nonce": "untrusted-client-nonce",
      "content-security-policy": "script-src 'unsafe-inline'",
    },
  });
  assert.equal(response.status, 200);
  const nonce = checkHeaders(response);
  assert.notEqual(nonce, "untrusted-client-nonce");
  const html = await response.text();
  assert.match(html, /Upload videos/);
  assert.doesNotMatch(html, /Add link|Sign in|Sign out|<iframe\b/);
  const scripts = [...html.matchAll(/<script\b[^>]*>/g)];
  assert.ok(scripts.length > 0, "Next.js scripts must be rendered");
  for (const [tag] of scripts)
    assert.ok(
      tag.includes(`nonce="${nonce}"`),
      "every script must use the response nonce",
    );

  const second = await fetch(origin);
  assert.notEqual(
    checkHeaders(second),
    nonce,
    "nonces must not be reused across responses",
  );
  await second.body?.cancel();

  for (const path of [
    "/login",
    "/auth/callback?code=unused&next=https://example.invalid/",
  ]) {
    const redirect = await fetch(origin + path, { redirect: "manual" });
    assert.equal(redirect.status, 307);
    assert.equal(
      new URL(redirect.headers.get("location"), origin).href,
      origin + "/",
    );
    checkHeaders(redirect);
    await redirect.body?.cancel();
  }
  const missing = await fetch(origin + "/missing-release-test");
  assert.equal(missing.status, 404);
  checkHeaders(missing);
  await missing.body?.cancel();
  console.log(
    "Production release verified: uploads visible, imports/accounts disabled, redirects local, nonce CSP and security headers active.",
  );
} finally {
  server.kill();
  await closed;
}
