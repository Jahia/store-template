# CLAUDE.md — store-template

> **Read [AGENTS.md](./AGENTS.md) first.** It contains the architecture, the hard
> engine constraints, the build/deploy/test loop, and the SonarQube setup for
> this module. This file only highlights the few things that most often trip up
> changes here.

## Must-knows before editing

- This is a **Jahia JavaScript module** (SSR React on `javascript-modules-engine`),
  not a JSP/JAR module. Build with `npm run build` → `dist/package.tgz`.
- **Don't add heavy deps that land in the SSR bundle.** `ssr.noExternal: true`
  inlines everything imported by server code into `dist/server/index.js`.
  Browser-only libs (e.g. DOMPurify) must be `await import(...)`-ed inside a
  handler/effect. No Apollo, no Moonstone (see AGENTS.md for why).
- **Authoring features hit the GraphQL permission wall.** Owner-only edits use
  `gqlRequest` (JCR ACLs). Write actions with a Java side (e.g. the module-JAR
  upload, `createEntryFromJar`) use the `privateappstore` Action over
  **XMLHttpRequest** (CSRF patches XHR, not `fetch`/plain `<form>` posts).
  `gqlRequest`/`fetch` to `/modules/graphql` is fine — not CSRF-gated.
- **Preserve E2E selectors** when refactoring markup: `[data-editor-ready]`,
  `[data-filter-ready]`, `[data-upload-ready]`, `[data-forge-card]`,
  `[role="tab"]`/`[role="tabpanel"]`, `[data-ckeditor-state]`,
  `[data-icon-input]`/`[data-icon-status]`, `[data-changelog-ready]`. The Cypress
  suite in `../privateappstore/tests` must stay green (`npx cypress run`).

## SonarQube

- Project key: `org.jahia.modules.javascript:store-template`.
- **Scan with JDK 17** (`JAVA_HOME=…graalvm-jdk-17.* mvn clean install sonar:sonar
  -Dsonar.sources=src`) — Java 11 fails the modern scanner with
  `UnsupportedClassVersionError`.
- Richtext fields use **CKEditor 5 from the deployed `richtext-ckeditor5` module**
  (federated remote, loaded at runtime by `loadCKEditor.ts`) — never bundled into
  store-template. Don't add a CKEditor/editor dependency to `package.json`.

## Standing repo rules

- Commit each change immediately (`git commit -s`), staging only the files you
  changed. Current feature branch: `SECURITY-571-js-module-migration`.
- Do not break the `moduleList.json` contract consumed by `privateappstore`.
