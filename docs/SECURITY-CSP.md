# Production Content-Security-Policy & security headers

> Scope: the `store-template` JavaScript module (SSR React via `javascript-modules-engine`)
> together with `privateappstore`. CSP and the related response headers are a **deployment
> concern** — they are emitted by the front door (reverse proxy or Jahia response-header
> configuration), not by a template module — so this file is the authoritative spec for what
> the policy must allow and how to roll it out. It is tailored to what the engine actually
> renders (verified against a live store page), not a cargo-culted block.

## Why this matters for this module

The module-detail page renders a few owner-authored **richtext** fields
(`description`, `license`) with `dangerouslySetInnerHTML`. Authoring is gated by `jcr:write`,
so the author is semi-trusted — but a malicious or compromised author could store HTML that
fires for every visitor (stored XSS). Defense-in-depth:

1. **DOMPurify** sanitizes richtext **on save** (see `ModuleEditor.client.tsx`) — strips
   `<script>`, inline event handlers and `javascript:` URLs before they are persisted.
2. **CSP** is the backstop: a `script-src` without `'unsafe-inline'` neutralizes any inline
   `<script>` / `onerror=` that ever slips past sanitization (e.g. content written directly
   through the JCR API rather than the editor).

Neither layer alone is sufficient; ship both. Also enable Jahia's server-side richtext HTML
filtering for the store site in production as a third layer.

## What the engine actually emits (verified)

A store page rendered by the engine contains, in `<head>`:

| Element | Origin | CSP impact |
| --- | --- | --- |
| `<script type="module" src="/modules/javascript-modules-engine/javascript/index.js">` | self | `script-src 'self'` |
| `<script type="text/javascript" src="/modules/CsrfServlet?tag=…">` (CSRF guard) | self | `script-src 'self'` |
| `<link rel="modulepreload" href="/modules/.../shared-libs/*.js">` (React, i18next, …) | self | `script-src 'self'` |
| island chunks `/modules/store-template/dist/client/**/*.js` + the dynamic `dist/assets/purify.es-*.js` | self | `script-src 'self'` |
| **`<script type="importmap">…</script>`** (React externalization map) | **inline** | needs a nonce — see below |
| `<script type="application/json" id="jahia-data-ctx|ck">`, `data-i18n-store`, `<jsm-island>` props | inline **data** | not executed → not subject to `script-src` in compliant browsers |
| `<link rel="stylesheet" href="/modules/store-template/dist/assets/style.css">` | self | `style-src 'self'` |
| `<iframe src="https://www.youtube.com/embed/…">` / `https://player.vimeo.com/video/…` (video views) | external | **`frame-src` must allow these** |

Runtime network calls made by the islands (all same-origin):

- `POST /modules/graphql` — admin screens, ModuleEditor, ScreenshotManager → `connect-src 'self'`
- `POST …/<module>.submitReview.do` — review submission (XHR) → `form-action`/`connect-src 'self'`
- dynamic `import('dompurify')` → `script-src 'self'`
- login form `POST` to the current page, search `GET` to home → `form-action 'self'`

No third-party script, style, font, or XHR origin is used. The only non-`self` resources are
the **YouTube/Vimeo video iframes** and (optionally) external images referenced from richtext.

### The importmap nonce caveat (the one hard part)

The engine emits **one executable inline script**: `<script type="importmap">`. Inline scripts
are only permitted by CSP via `'unsafe-inline'`, a hash, or a **nonce**. For an importmap a
hash is impractical (its contents vary per page with the shared-libs in use), and
`'unsafe-inline'` would re-open the very XSS hole we are closing. The correct answer is a
**per-request nonce** that the engine stamps onto the importmap (and any other inline script).

The engine in this environment does **not** currently emit a `nonce` attribute. So a strict
`script-src 'self' 'nonce-…'` policy requires one of:

- **(preferred)** engine support for a per-request nonce on its inline scripts — track/request
  this with the `javascript-modules-engine` team; once available, drop in the nonce and the
  policy below is fully strict; or
- a reverse proxy that injects a fresh nonce into both the CSP header **and** the importmap
  tag on the way out (e.g. nginx `sub_filter` + a generated nonce); or
- **(interim, weaker)** allow inline scripts and rely on DOMPurify + server-side HTML
  filtering as the richtext-XSS defense. Document the accepted risk if you choose this.

## Recommended production policy

Target state (once the importmap carries a request nonce — substitute `{NONCE}` per request):

```text
Content-Security-Policy:
  default-src 'self';
  base-uri 'self';
  object-src 'none';
  frame-ancestors 'self';
  form-action 'self';
  script-src 'self' 'nonce-{NONCE}';
  style-src 'self';
  img-src 'self' data: https:;
  font-src 'self';
  connect-src 'self';
  frame-src https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com;
  upgrade-insecure-requests
```

Notes:
- `script-src` has **no `'unsafe-inline'`** — that is the point. The nonce covers the importmap.
- `frame-src` is required for the video views; drop it if the site never embeds video.
- `style-src 'self'` works because all styling is the module's external `style.css` (no inline
  `<style>` or `style=` is rendered). If you later add inline styles, add a style nonce rather
  than `'unsafe-inline'`.
- `img-src … https:` is permissive for images referenced from richtext; tighten to `'self'`
  if richtext images are disallowed.
- Add `report-uri`/`report-to` during rollout (below).

### Companion security headers

```text
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: SAMEORIGIN
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

(`frame-ancestors` supersedes `X-Frame-Options` on modern browsers; keep both for coverage.)

## Rollout

1. **Report-only first.** Ship `Content-Security-Policy-Report-Only` with the policy above plus
   a `report-uri`, watch for violations for a release cycle, then flip to enforcing. This
   catches any origin this doc missed (e.g. a new third-party embed).
2. Verify video still plays (YouTube/Vimeo), the admin screens and ModuleEditor save
   (GraphQL), review submission works (XHR), and no console CSP errors remain.
3. Confirm the importmap loads (no "Refused to apply importmap" error) — the litmus test for
   the nonce wiring.

## Deployment examples

### nginx reverse proxy

```nginx
# add_header runs for proxied responses; keep one source of truth here.
add_header Content-Security-Policy "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'self'; form-action 'self'; script-src 'self' 'nonce-$request_id'; style-src 'self'; img-src 'self' data: https:; font-src 'self'; connect-src 'self'; frame-src https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com; upgrade-insecure-requests" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "SAMEORIGIN" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
# $request_id is a stable per-request nonce; it must also be injected into the importmap tag
# (sub_filter or engine support) for script-src to accept it.
```

### Jahia

If a proxy is not in front of Jahia, set the same headers via Jahia's response-headers
configuration (or a small servlet filter). Do **not** attempt to emit CSP from the template
module: SSR runs after the response has begun and a `<meta http-equiv>` CSP cannot express
`frame-ancestors`, `report-uri`, or a per-request nonce.

## Status

- Header **spec** complete and tailored to the engine's real output (this file).
- **DOMPurify** richtext sanitization is implemented and tested (`19-reviewsAndRichtext.cy.ts`).
- **Enforcement** is deployment-side and gated on a per-request nonce for the engine importmap —
  the one engine-level dependency called out above.
