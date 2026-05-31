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
  `gqlRequest` (JCR ACLs); any-user actions (reviews) use the `privateappstore`
  Action over **XMLHttpRequest** (CSRF), never `fetch`.
- **Preserve E2E selectors** when refactoring markup: `[data-star]`,
  `[data-review-ready]`/`[data-review-done]`, `[data-editor-ready]`,
  `[data-filter-ready]`, `[role="tab"]`. The Cypress suite in
  `../privateappstore/tests` must stay green (`npx cypress run`).

## SonarQube

- Project key: `org.jahia.modules.javascript:store-template`.
- **Scan with JDK 17** (`JAVA_HOME=…graalvm-jdk-17.* mvn clean install sonar:sonar
  -Dsonar.sources=src`) — Java 11 fails the modern scanner with
  `UnsupportedClassVersionError`.
- `RichTextEditor`'s `document.execCommand` (S1874) is an **accepted** exception
  (dependency-free contenteditable); don't "fix" it by adding a library.

## Standing repo rules

- Commit each change immediately (`git commit -s`), staging only the files you
  changed. Current feature branch: `SECURITY-571-js-module-migration`.
- Do not break the `moduleList.json` contract consumed by `privateappstore`.
