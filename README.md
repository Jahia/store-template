# store-template

The **Jahia Store Template** — a Jahia 8.2 **JavaScript module** (server-side
React on the `javascript-modules-engine`) that renders the Private App Store
website and its in-site administration (Forge settings, Categories, Roles).

It is the presentation and authoring layer for the **`privateappstore`** Java
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
API (install `js:file:/…/store-template.tgz`; uninstall the same SNAPSHOT version
first). See [AGENTS.md](./AGENTS.md) for the exact commands.

## Tests

End-to-end tests (Cypress) live in `../privateappstore/tests` and run against a
Jahia instance on `localhost:8080`:

```bash
cd ../privateappstore/tests && npx cypress run
```

## Documentation

- [AGENTS.md](./AGENTS.md) — architecture, engine constraints, build/deploy/test,
  SonarQube setup. **Start here if you (or an AI agent) are modifying this module.**
- [docs/JS-MODULE-MIGRATION.md](./docs/JS-MODULE-MIGRATION.md) — the JSP → JS
  module migration history and design decisions.
- [docs/SECURITY-CSP.md](./docs/SECURITY-CSP.md) — production Content-Security-Policy
  guidance.

## License

Apache-2.0.
