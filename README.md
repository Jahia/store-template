# jahia-store-template

The **Jahia Store Template** - a Jahia 8.2 **JavaScript module** (server-side
React on the `javascript-modules-engine`) that renders the Private App Store
website and its in-site administration (Forge settings, Categories, Roles).

It is the presentation and authoring layer for the **`jahia-store`** Java
module, which owns the backend logic and the JCR content model.

## Tech stack

- `@jahia/javascript-modules-library` + `@jahia/vite-plugin` (1.2.0)
- React 19 (SSR via GraalVM) + hydration islands
- Vite 8, TypeScript, CSS Modules, i18next
- DOMPurify (dynamically imported, browser-only)

## Quick start

```bash
npm install
npm run build          # vite build + npm pack -> dist/package.tgz
```

Deploy the built `dist/package.tgz` into a running Jahia via the provisioning
API (install `js:file:/…/jahia-store-template.tgz`; uninstall the same SNAPSHOT version
first). See [AGENTS.md](./AGENTS.md) for the exact commands.

## Tests

End-to-end tests (Cypress) live in `../privateappstore/tests` and run against a
Jahia instance on `localhost:8080`:

```bash
cd ../privateappstore/tests && npx cypress run
```

## Accessibility

**Conformance target: WCAG 2.2 Level AAA.**

This applies to everything the template controls - document structure and
landmarks, color and contrast, focus order, keyboard operability, and motion.
Notably, all text meets the AAA **enhanced contrast** threshold (≥ 7:1), and the
page exposes exactly one top-level `<main>` landmark.

Some AAA success criteria are inherently **content-dependent** (e.g. 1.2.6
sign-language for prerecorded video, 3.1.5 reading level) and therefore rest with
the editors who publish into the store, not with this template. The template's
job is to provide an AAA-capable structure and style system; the
[accessibility invariants in AGENTS.md](./AGENTS.md) keep it that way across
changes. The target is currently verified by manual axe-core / EqualWeb audits -
there is no automated gate in the E2E suite yet.

## Caching and per-user rendering

Jahia caches every rendered fragment under a key that includes the viewer's
permissions but **not** their identity, so two users holding the same role are
served the same cached HTML. Anything this template renders that varies per
*user* rather than per *permission* must therefore say so explicitly, with
`properties: { "cache.perUser": "true" }` on the template or view. Two components
do: the `jnt:page` `default` template (its header shows the viewer's own
username) and the My-modules list (its rows are selected on `jcr:createdBy`).

This is not a performance detail - getting it wrong discloses one user's data to
another, which is what [GHSA-g6wp-ghxm-mx76](https://github.com/Jahia/store-template/security/advisories/GHSA-g6wp-ghxm-mx76)
records. The rule and the trap in verifying a fix are in
[AGENTS.md](./AGENTS.md) under "Hard engine constraints"; the guard is
`../privateappstore/tests/cypress/e2e/25-fragmentCacheIdentity.cy.ts`.

## Documentation

- [AGENTS.md](./AGENTS.md) - architecture, engine constraints, build/deploy/test,
  SonarQube setup. **Start here if you (or an AI agent) are modifying this module.**
- [docs/JS-MODULE-MIGRATION.md](./docs/JS-MODULE-MIGRATION.md) - the JSP → JS
  module migration history and design decisions.
- [docs/SECURITY-CSP.md](./docs/SECURITY-CSP.md) - production Content-Security-Policy
  guidance.

## License

Apache-2.0.
