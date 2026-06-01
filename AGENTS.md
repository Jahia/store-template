# AGENTS.md — store-template

Guidance for AI agents (and humans) working in this repo. Read this before editing.

## What this is

`store-template` is the **Jahia 8.2 JavaScript module** that renders the Private
App Store website *and* its in-site admin (Forge settings / Categories / Roles).
It was migrated from a legacy JSP/Bootstrap-3 template set to a **server-side
React** module running on the `javascript-modules-engine` (GraalVM SSR + Vite).
See `docs/JS-MODULE-MIGRATION.md` for the full migration history and rationale.

- Packaging: a Jahia JS module shipped as a `.tgz` (not a JAR). `mvn package`
  shells out to npm; the build artifact is `dist/package.tgz`.
- Runtime data (modules, categories, versions) lives in the JCR and is mostly
  produced by the sibling **`privateappstore`** Java module. This repo is the
  *presentation + authoring UI*; `privateappstore` is the *backend/contract*.

## Architecture

- **Two Vite build environments** (`@jahia/vite-plugin`):
  - **client** — files matching `**/*.client.{jsx,tsx}` are hydration *islands*,
    emitted to `dist/client/…`. They are SSR-rendered first, then hydrated.
  - **ssr** — `**/*.server.*` plus everything they import is bundled into
    `dist/server/index.js`. `ssr.noExternal: true`, so **every imported dep is
    inlined into the SSR bundle**.
- **Islands**: wrap a `.client.tsx` component in `<Island component={X} props={…} />`
  from a server component. Props must be JSON-serializable (they cross the
  SSR→hydration boundary). Use a `data-*-ready` attribute set in a mount effect
  as a deterministic "hydrated" signal for tests.
- **i18n**: site chrome uses the engine's `settings/locales`; the admin uses
  `src/admin/locales` under the `privateappstore` namespace.
- **Page templates** are React components with `componentType: "template"`.
  `settings/import.xml` seeds a working store on every store-template site.

## Hard engine constraints (do not relearn these the hard way)

1. **No Moonstone / heavy React UI libs.** The engine runs React 19; Moonstone
   pulls React 18 → conflict. UI here is plain HTML + CSS Modules.
2. **No Apollo Client.** Its SSR build imports `node:module`, which GraalVM
   rejects. Use `fetch` — see `src/lib/graphql.ts` (`gqlRequest`).
3. **GraalVM rejects optional-call `?.()` on Java host objects.** Call methods on
   `JCRNodeWrapper` etc. directly; guard with `if`/`hasProperty` instead.
4. **Keep heavy browser-only deps out of the SSR bundle.** DOMPurify is loaded
   with a dynamic `await import("dompurify")` so it becomes its own lazy chunk
   (`dist/server/purify.es-*.js`) and never enters `index.js`. If you add a
   browser-only lib used only in a handler/effect, import it the same way.
5. `manualPureFunctions: ["useEffect"]` strips effects from the SSR render — do
   not rely on an effect running server-side.

## The GraphQL permission wall (critical for authoring features)

The Jahia `/modules/graphql` endpoint is **permission-gated**: ordinary
authenticated users get `GqlAccessDeniedException`. Only roles such as
store-developer/admin can use it.

- **Owner-only authoring** (edit own module metadata, manage screenshots) uses
  generic JCR GraphQL mutations via `gqlRequest`; JCR ACLs enforce permissions.
- **Write actions that need an in-workspace Java side** (e.g. uploading a module
  JAR, which runs a Maven deploy then creates the nodes) CANNOT use GraphQL. They
  go to a Jahia **Action** in `privateappstore` (`createEntryFromJar`), invoked at
  `…/modules-repository.createEntryFromJar.do`.
- **CSRF**: Jahia's OWASP CSRFGuard injects `/modules/CsrfServlet`, which patches
  **XMLHttpRequest only — not `fetch`, and not plain full-page `<form>` posts**.
  Action POSTs (the `.do` URLs) must use `XMLHttpRequest`, or they are rejected
  ("Required Token is missing" / "Request Token does not match Page Token"). See
  `FileUpload/FileUpload.client.tsx#postMultipart`. (Plain `gqlRequest`/`fetch` to
  `/modules/graphql` is fine — that endpoint is not CSRF-gated.)

## Directory map

```
src/
  components/
    forge/        module/package cards, detail, screenshots (Lightbox),
                  rich-text editor, versions, store filter
    chrome/       site header (nav, search, login island), footer, layout
    ForgeModulesList/, ForgeMyModulesList/, FileUpload/   server views
  admin/          in-site admin island (AdminApp + ForgeSettings/CategorySettings/ManageRoles)
  lib/            graphql.ts (fetch-based gqlRequest), helpers
settings/         import.xml (seed structure) + locales
docs/             JS-MODULE-MIGRATION.md, SECURITY-CSP.md
dist/             build output (client islands, server bundle, package.tgz)
```

## Build / deploy / test

- **Build**: `npm run build` → `vite build` + `npm pack` → `dist/package.tgz`.
  (`mvn package` does the same for CI parity; the pom is `packaging=pom` and
  just drives npm.)
- **Deploy to a running Jahia** (dev loop): copy the tgz into the container and
  install via the provisioning API; a **same-version tgz must be uninstalled
  first** (it clashes otherwise):
  ```
  docker cp dist/package.tgz jahia:/tmp/store-template.tgz
  # POST /modules/api/provisioning  (basic auth):
  #   [{"uninstallBundle":"org.jahia.modules.javascript/store-template/3.1.8.SNAPSHOT"}]
  #   [{"installBundle":["js:file:/tmp/store-template.tgz"],"autoStart":true}]
  ```
- **E2E** lives in `../privateappstore/tests` (Cypress, `baseUrl` localhost:8080).
  `npx cypress run`. The suite must stay green. Selectors that code changes must
  preserve: `[data-editor-ready]`, `[data-filter-ready]`, `[data-upload-ready]`,
  `[data-forge-card]`, `[role="tab"]`/`[role="tabpanel"]` (admin + module editor),
  `[data-ckeditor-state]`, `[data-icon-input]`/`[data-icon-status]`,
  `[data-changelog-ready]`, `#forge-url`/`#forge-id`/`#forge-user`.

## SonarQube

- Project key: **`org.jahia.modules.javascript:store-template`**.
- Scan needs **JDK 17** — the bare pom resolves the latest `sonar-maven-plugin`
  (Java-17 bytecode); the host default is Java 11, which fails with
  `UnsupportedClassVersionError`. Run with `JAVA_HOME` pointing at a JDK 17:
  ```
  JAVA_HOME=/usr/lib/jvm/graalvm-jdk-17.* mvn -B clean install sonar:sonar \
    -Dsonar.sources=src -Dsonar.exclusions='**/node_modules/**,dist/**'
  ```
- The quality gate uses the **overall reliability rating** (worst-issue-wins), so
  even one reliability-impact issue (`S2871` array sort, `S7781` `replace`→
  `replaceAll`, `S6847`/`S1082`/`S6842` non-interactive elements with handlers)
  fails the gate. Maintainability smells (`S6759`, `S7764`, `S6582`, `S6819`) do
  not move the gate but should be kept clean.
- **Richtext editing uses CKEditor 5 from the deployed `richtext-ckeditor5`
  module**, loaded at runtime (`loadCKEditor.ts` → `CKEditorField.tsx`), NOT
  bundled. That module exposes CKEditor as a webpack Module Federation remote;
  `loadCKEditor` stubs `window.appShell.remotes`, injects
  `/modules/richtext-ckeditor5/javascript/apps/remoteEntry.js`, then
  `container.init({})` + `get(".")` to reach `ClassicEditor` (verified to work on
  the live delivery page, where jContent's app-shell is absent). Keeping CKEditor
  out of store-template's bundle is deliberate — inlining a real editor into the
  SSR bundle is the failure mode that ruled out Apollo. Output is still
  DOMPurify-sanitized on save (defense-in-depth). If the remote can't load,
  `CKEditorField` degrades to a textarea. (The old dependency-free `execCommand`
  `RichTextEditor` / `S1874` exception is gone.)

## Accessibility invariants (target: WCAG 2.2 Level AAA)

This module targets **WCAG 2.2 Level AAA** for everything it controls (structure,
color, focus, keyboard). The invariants below are what keep it there — don't
regress them. Verified against an axe-core / EqualWeb audit.

- **`Layout` owns the one and only `<main>` landmark.** Page templates
  (`templates/Page/*.server.tsx`) supply *content* as `Layout` children — they
  must NOT render their own `<main>`, or you get a nested/duplicate `main`
  landmark (axe flags three best-practice violations at once).
- **Muted/secondary text must use `var(--color-text-muted)`**, never a hardcoded
  gray. The token is tuned to WCAG **AAA** enhanced contrast (≥7:1) on every
  surface; hardcoding a lighter gray silently drops below 7:1 and re-introduces
  the contrast violation.

## Conventions

- CSS Modules per component; design tokens as CSS custom properties.
- Components PascalCase; hooks `use*`; client islands end in `.client.tsx`;
  server views in `*.server.tsx`.
- Keep files focused (< ~400 lines). Immutable updates. Handle errors explicitly
  (no swallowed catches; no `console.*` in production code).
- **Do not break the `moduleList.json` contract** consumed by `privateappstore`.
