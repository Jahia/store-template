# store-template → Jahia JavaScript Module — Migration Plan

Status: **COMPLETE (2026-05-31)** — Phases 0–5 done; `store-template` is a pure Jahia JavaScript
module (no JSP). Full E2E **71/71** across 18 specs against the JS stack. Deferred enhancements
(review submission, rich-text editing) noted under Phase 3 / Phase 5.
Target: convert `store-template` from a JSP/Bootstrap3 OSGi template set into a Jahia
**JavaScript Module** (SSR React via `@jahia/javascript-modules-engine`), modelled on
`luxe-jahia-demo`.

A primary near-term driver: render the Private App Store **admin screens (Forge settings,
Categories, Roles) directly inside the website** again — which falls out naturally once the
module is React, because JS modules render admin-style screens as ordinary in-site views
with server-side permission checks (they do not register Jahia `adminRoute`s).

---

## 0. Reference facts (verified)

| Fact | Source |
|---|---|
| Engine is an installable OSGi bundle; JSP modules and JS modules run side-by-side on Jahia 8.2 EE | `luxe` runs `jahia-ee:8.2`; privateappstore runs `jahia-ee-dev:8-SNAPSHOT` |
| Enable engine via one provisioning line | `luxe/docker/provisioning.yml`: `- installOrUpgradeBundle: "mvn:org.jahia.modules/javascript-modules-engine"` |
| JS module deps declared in `package.json` `jahia` block | `luxe template-set package.json`: `module-dependencies: "default,javascript-modules-engine=[1.1,2)"`, `module-type: templatesSet`, `server: dist/server/index.js`, `static-resources`, `required-version: 8.2.1.0` |
| Build = `tsc --noEmit && vite build && yarn pack` → `dist/package.tgz`; Maven `build-helper` attaches the tgz so `mvn:` coordinates still resolve | `luxe template-set` `package.json` + `pom.xml` |
| Server components read JCR **directly** (`getChildNodes`, `getNodesByJCRQuery`, props from node properties); client islands use `/modules/graphql` | `luxe` JcrQuery / Estate / SearchEstate |
| Components register via `jahiaComponent({nodeType,name,componentType:'view'|'template'}, fn)`; co-located `definition.cnd`; `name` ⇒ view name (`default`, `cm`, `fullPage`, …) | `luxe` Section/Realtor/Page |
| Interactivity via `<Island component={Client} props={serializable}/>` + `*.client.tsx` (default export) | `luxe` SearchEstate/Login |
| i18n in `settings/locales/<lang>.json`, used via `useTranslation()` | `luxe` |

`store-template` today: **48 JSP views / ~7,100 LOC**, 21 node-type view dirs, a **1,212-line**
`repository.xml`, 3 Java classes (2 actions + 1 tag library), heavy jQuery stack
(isotope, select2, photoswipe, wysihtml5, bootstrap-editable), Bootstrap3 LESS.

Difficulty profile of the 48 views (from inventory): **TRIVIAL 8 / MEDIUM 32 / HARD 8**.

---

## 0bis. Engine spike — RESULT: **GO** (2026-05-31)

Ran against the live stack (`jahia-ee-dev:8-SNAPSHOT`, license 8.2.0.6) before scaffolding.

- **The dev image already ships the engine** (`javascript-modules-engine v1.3.0-SNAPSHOT`, bundle
  [127]). JS modules are a first-class runtime on this build.
- Installed **engine 1.2.0** via provisioning API (`mvn:org.jahia.modules/javascript-modules-engine/1.2.0`,
  autoStart) — module manager hot-swapped 1.3.0-SNAPSHOT → 1.2.0; reached **ACTIVE**, registered 24
  views, "Operation successful". We standardize on **1.2.0** (matches `[1.1,2)` + library 1.2.0).
- **Toolchain validated**: a minimal module (`@jahia/vite-plugin` 1.2.0 + Vite 8 + React 19 on
  Node 22) built `dist/server/index.js` with the `jahiaComponent()` registrations compiled to SSR.
- **Deploy + registration validated**: `npm pack` tgz installed via `js:file:` provisioning →
  `[GraalVMEngine] Registered bundle … in GraalVM engine`, and both component kinds bound:
  `…_view_jnt:text_spike` and `…_template_jnt:page_spike`. Server components run on **GraalVM**
  inside the JVM (synchronous direct-JCR access). Throwaway module cleanly uninstalled afterwards.
- **Not exercised**: an HTTP GET of a rendered page (needs a content site; GraphQL `jcr` is locked
  for basic-auth here). Deferred to Phase 0/1, where a site exists naturally. GraalVM component
  registration is the conclusive SSR proof.
- **Dev-loop note**: local `npm pack` + `js:file:` install works with no Maven/Nexus round-trip —
  fast iteration for Phase 0+.

---

## 1. Target architecture

```
store-template/                      (becomes a JS module; stays its own git repo)
├─ package.json                      jahia{} block + scripts (vite/tsc/pack/deploy)
├─ vite.config.js                    @jahia/vite-plugin
├─ tsconfig.json, eslint, prettier
├─ pom.xml                           hybrid: build-helper attaches dist/package.tgz (keeps mvn: coords + CI)
├─ settings/
│  ├─ locales/{en,fr,de,es,it,pt}.json
│  └─ definitions.cnd                (module-owned types not co-located)
├─ src/
│  ├─ templates/                     Page templates (Layout, base/home/search/module/edit/admin)
│  ├─ components/<NodeType>/         default.server.tsx (+ cm/fullPage), *.client.tsx, *.module.css, definition.cnd
│  └─ admin/                         ForgeSettings / CategorySettings / ManageRoles (in-site React)
└─ static|icons|images
```

### Cross-cutting decisions (recommended; confirm before the relevant phase)
1. **Server vs client data**: server views read JCR directly via the engine library; only
   interactive islands hit `/modules/graphql`. (No Apollo in server code, no Next.js.)
2. **`ForgeFunctions` (version sort/latest/prev/next)**: reimplement in TypeScript, server-side,
   over direct JCR — trivial logic, removes the JSP tag-lib dependency.
3. **Java actions `DeleteScreenshot` / `ReorderScreenshots`**: store-template becomes pure JS, so
   move this server logic to **GraphQL mutations in the `privateappstore` Java module** (it already
   hosts GraphQL extensions and the IDOR-prevention checks belong server-side). Islands call them.
   *(Alt: keep a thin Java companion module. Decision needed at Phase 3.)*
4. **Styling**: rebuild with CSS Modules per component; **drop Bootstrap3 / jQuery / LESS** and the
   `bootstrap3-*`, `jquery` module dependencies. Follow `.claude/rules/ecc/web/design-quality.md`.
5. **Plugin replacements**: isotope+select2 filtering → React state; photoswipe → a small React
   lightbox or a vetted client lib in an island; wysihtml5/CKEditor → a React rich-text island;
   file-input → native `<input type=file>` + island upload.
6. **i18n**: migrate the ~150–200 JSP bundle keys into `settings/locales/*.json`.
7. **Monorepo (optional)**: could adopt luxe-style yarn workspaces (`design-system` +
   `template-set` + `prepackaged-site`); minimally, keep `store-template` as one JS-module package.

### Runtime / dependency changes
- Add provisioning line `installOrUpgradeBundle: "mvn:org.jahia.modules/javascript-modules-engine"`
  to the test stacks that load store-template (privateappstore + store-template test provisioning).
- `module-dependencies`: `default, javascript-modules-engine=[1.1,2), privateappstore, search`
  (drop bootstrap3/jquery/font-awesome once views no longer use them).
- Pin/confirm an engine build compatible with our Jahia (`required-version`); our stack is
  8.2 EE-dev (license 8.2.0.6); luxe targets 8.2.1.0 — verify at Phase 0.

---

## 2. Phased plan (end state = complete JS module)

Phases are incremental and shippable; JSP and JS views **coexist** during the migration, so the
site keeps working after every phase. Effort numbers are rough order-of-magnitude, not commitments.

### Phase 0 — Toolchain & skeleton (prove the pipeline) — **DONE** (2026-05-31)
- ✅ New branch `SECURITY-571-js-module-migration`.
- ✅ Added `package.json` (jahia block + scripts), `vite.config.js`, `tsconfig.json`, `.yarnrc.yml`,
  `.gitignore` entries; JS source under `src/` (legacy JSP under `src/main` left untouched until
  cutover — they don't collide; Vite only globs `*.server.tsx`/`*.client.tsx`).
- ✅ Engine↔Jahia compatibility proven by the 0bis spike (engine 1.2.0 ACTIVE; image pre-ships it).
- ✅ Base `Layout` + `Page/default.server.tsx` (`jnt:page` default template) build via Vite →
  `dist/server/index.js`; packaged (`npm pack`) and deployed via `js:file:`.
- ✅ **Exit criterion met — HTTP page render**: created a `phase0` site (templateSet `store-template`)
  + a `jnt:page` home, rendered `/cms/render/default/en/sites/phase0/home.html` → our SSR output
  `<body><main><h1 data-store-template="js">Phase 0 Home</h1></main></body>` (jcr:title → prop →
  GraalVM SSR → HTTP). The whole pipeline works on the live stack.
- **Deferred to cutover** (not blocking): hybrid Maven `build-helper` attach-tgz for CI/`mvn:`
  provisioning, package-manager standardization (used `npx vite build` + `npm pack`; a classic
  `yarn.lock` is committed for now), JSP/pom removal.

> Dev-loop proven here: `npx vite build` → `npm pack --pack-destination build` →
> `docker cp` the tgz → install via provisioning `installBundle: ["js:file:/tmp/…tgz"]`. Run
> server-side Groovy via `executeScript: "file:/abs.groovy"` (JSON body — avoids the container
> curl's multipart quirk) and have scripts write to a file (`println` doesn't reach Docker logs).

### Phase 1 — Site chrome + ADMIN vertical slice (delivers the original ask)
**Admin slice — DONE (2026-05-31).** The three admin screens render in-site.
- ✅ `src/templates/Page/site-admin.server.tsx`: `jnt:page` template `site-admin`, resolves
  siteKey + locale, checks `siteAdminForgeSettings`, mounts one `<Island>`.
- ✅ `src/admin/`: ported `ForgeSettings`, `CategorySettings`, `ManageRoles` from privateappstore
  (logic/i18n unchanged) into a tabbed `AdminApp.client.tsx` island; reuse the existing GraphQL
  contracts (`forgeSettings`, `forgeCategorySettings`, `manageRolesSettings` + mutations).
- ✅ Two forced deviations from the original "reuse verbatim" plan, both hard engine constraints:
  - **Moonstone dropped** (React 18 vs the island runtime's React 19) → plain accessible HTML +
    `admin.module.css`.
  - **Apollo dropped** (its SSR build imports `node:module`, which GraalVM rejects at init) →
    `fetch`-based `gql.ts` (`useGqlQuery` + `gqlRequest`), the luxe-idiomatic approach.
  - Self-contained i18next (`i18n.ts` + `locales/en.json`, `privateappstore` namespace).
- ✅ Verified on the `phase0` site: `/sites/phase0/admin.html` → HTTP 200, three `role="tab"`
  buttons (i18n labels SSR'd), `<jsm-island>` with `{siteKey, language}`, active-tab `Loading…`.

**Site chrome — DONE (2026-05-31).**
- ✅ Full `Layout` (`src/templates/Layout.tsx` + `Layout.module.css`): `<head>` SEO + loads the
  module's single `style.css` via `<AddResources>` (this also fixed the admin island being unstyled).
- ✅ `src/styles/global.css`: design tokens + base (intentional, not Bootstrap defaults).
- ✅ `src/components/chrome/`: `Header.tsx` (brand, nav from the home page's child pages, module
  search box, login island), `Footer.tsx` (Jahia copyright + legal/social links, ported from the
  JSP), `Login.client.tsx` (login/logout island — posts username/password to the current page so
  Jahia's auth valve logs in; logout via `URLGenerator.getLogout()`).
- ✅ Two islands per page (Login + AdminApp) hydrate independently.

**Browser E2E — DONE.** `privateappstore/tests/cypress/e2e/15-inSiteAdmin.cy.ts` (guarded; **5/5
pass**): chrome present, admin tabs hydrate, tab switching, and a Forge-settings save round-trips
through `/modules/graphql` under the browser session.

**i18n (en/fr) — DONE (2026-05-31).**
- ✅ Admin screens: `src/admin/locales/{en,fr}.json` (privateappstore namespace) wired into
  `getAdminI18n(language)`; language comes from `currentResource.getLocale().getLanguage()`.
- ✅ Chrome: `settings/locales/{en,fr}.json` (engine i18n) used via `useTranslation()` in
  Header/Footer/site-admin; the Login island receives translated labels as **props** (keys used
  only post-click wouldn't be in the SSR-collected store).
- ✅ Verified on a fr-enabled site: `/cms/render/default/fr/.../admin.html` → French chrome
  ("Administration du store", "Connexion", "Rechercher des modules") **and** French admin tabs
  ("App Store privé", "Catégories App Store", "Rôles App Store").

**Phase 1 — COMPLETE.** Remaining items belong to later phases: the header search resolves once
Phase 2 builds the `search-results` page/view.
- **Exit criteria**: an authorised user manages forge settings, categories, and roles from a page
  **inside the store website**, with full site chrome and en/fr i18n — ✅ achieved & browser-verified.

### Phase 2 — Storefront read views — IN PROGRESS

**Slice 2a — cards + list + detail — DONE (2026-05-31).**
- ✅ `src/components/forge/`: `forgeCard.ts` (excerpt/icon helpers), `ForgeEntryCard.tsx` (card UI),
  `versions.ts` (newest-first version sort + download URL — replaces Java `ForgeFunctions`),
  `ForgeEntryDetail.tsx` (detail UI), `forge.module.css` + `detail.module.css`.
- ✅ Views: `jnt:forgeModule`/`jnt:forgePackage` **`default` view** = card; **`default` template** =
  full detail page (same `default` name, keyed apart by view-vs-template — no `jmix:mainResource`
  needed). `jnt:forgeModulesList` **`default` view** = responsive grid querying `jmix:forgeElement`
  WHERE `published = true` under the start node (defaults to `…/contents/modules-repository`).
- ✅ Verified on a seeded site + E2E `privateappstore/tests/cypress/e2e/16-storefront.cy.ts` (2/2):
  grid lists published modules and hides unpublished ones; detail page shows title/description,
  versions newest-first, changelog, download links, status/supported badges.

**Slice 2b — filtering + search — DONE (2026-05-31).**
- ✅ `src/components/forge/StoreFilter.client.tsx` (+ `store-filter.module.css`): instant client-side
  filter (text + status facets) over the SSR'd cards — the React replacement for isotope/select2.
  Cards carry `data-forge-card`/`data-status`/`data-title`; the island toggles `[hidden]` and syncs
  the URL (`src_terms`, `status`). SSR-safe (constant initial state; URL read in an effect → no
  hydration mismatch). The header search now navigates to the list page and seeds this filter.
- ✅ E2E (`16-storefront.cy.ts`, now 4/4): filter by status + by text hide/show the right cards.
- Gotchas recorded: a `clientOnly` island still hydrates its placeholder → mismatch (use SSR-safe
  state instead); `[hidden]` needs `.card[hidden]{display:none}` to beat `.card{display:flex}`.

**Slice 2c — versions / video / my-modules / lightbox — DONE (2026-05-31).**
- ✅ `VersionViews.server.tsx` + `VersionCard.tsx`: `default` view for `jnt:forgeModuleVersion` /
  `jnt:forgePackageVersion`; the detail now renders versions via `<Render view="default">` over
  `sortedVersionNodes()` (newest-first). Shared `nodeProps.ts` (`str`/`bool`).
- ✅ `Videostreaming/default.server.tsx`: `jnt:videostreaming` → YouTube/Vimeo `<iframe>` from
  `provider`+`identifier`; the detail renders the module's `video` child.
- ✅ `ForgeMyModulesList/default.server.tsx`: the logged-in user's own modules (by `jcr:createdBy`,
  no published filter — owners see their drafts).
- ✅ `Lightbox.client.tsx`: screenshots gallery with click-to-zoom overlay (SSR thumbnails + client
  overlay state) — replaces photoswipe/lity.
- ✅ E2E (`16-storefront.cy.ts`, now 5/5): detail shows version + YouTube embed + download;
  My-modules lists the user's modules incl. drafts. Full set 15+16 = **10/10**.

**Phase 2 read views — COMPLETE.** Browse → filter/search → detail → versions/video/screenshots →
download, plus my-modules, all run on JS views. Retiring the corresponding JSP views happens at
cutover (Phase 5).
- **Exit criteria**: browsing/search/detail run on JS views — ✅ achieved & browser-verified.

### Phase 3 — Authoring / interactive views — IN PROGRESS

**Java-actions decision — RESOLVED:** most authoring uses the dxm-provider's **generic `jcr`
GraphQL mutations** (`mutateNode→mutateProperty→setValue`, `addNode`, `delete`, reorder) over a
session-authenticated `fetch` (`src/lib/graphql.ts`); JCR ACLs enforce permissions. So the two
store-template Java actions (DeleteScreenshot/ReorderScreenshots) are **dropped, not relocated**.
Only the JAR upload keeps the existing `createEntryFromJar` Java action (it runs a Maven deploy).

**Slice 3a — module metadata editing — DONE (2026-05-31).**
- ✅ `ModuleEditor.client.tsx` (+ `editor.module.css`): in-site editor for jcr:title / description /
  howToInstall / FAQ / license / author* / codeRepository, saving each changed field via the jcr
  `setValue` mutation. Gated server-side by `node.hasPermission("jcr:write")` in `ForgeEntryDetail`.
- ✅ Detail templates set `cache.expiration:"0"` so edits show on next load (the cached fragment's
  flush raced the save; proper cache deps deferred to the Phase 5 perf pass).
- ✅ E2E `17-authoring.cy.ts` (2/2): the editor shows for jcr:write users; editing title +
  codeRepository persists (verified via reload). Full set 15+16+17 = **12/12**.
- Island lessons codified: wait on a `data-*-ready` hydration marker before clicking; avoid async
  `location.reload()` in favour of a deterministic success state (also stabilised the StoreFilter).

**Slice 3b — screenshot management — DONE (2026-05-31).**
- ✅ `ScreenshotManager.client.tsx` (+ `screenshots.module.css`): owner-facing reorder (↑/↓) + delete
  of a module's screenshots via the generic jcr mutations (`reorderChildren` / `delete`), optimistic
  UI reverting on error. The direct replacement for the dropped DeleteScreenshot / ReorderScreenshots
  Java actions — gated purely by JCR ACLs. The detail shows the manager to owners (jcr:write) and the
  read-only Lightbox to everyone else.
- ✅ E2E `17-authoring.cy.ts` (3/3): upload two screenshots → reorder persists (verified via reload)
  → delete persists. Full set 15+16+17 = **13/13**.

**Slice 3c — JAR upload + reviews display — DONE (2026-05-31).**
- ✅ `FileUpload/default.server.tsx` (+ `upload.module.css`): the `jnt:fileUpload` view renders a
  multipart form posting to `…modules-repository.createEntryFromJar.do` (file + redirectURL +
  successRedirectUrl), gated on login. The existing Java action handles JAR parsing + Maven deploy +
  node creation (the only authoring piece keeping a Java action).
- ✅ Reviews **display** in `ForgeEntryDetail`: lists `jnt:review` children (stars/title/content/
  author) + an average-rating badge in the header. Read-only.
- ✅ E2E `17-authoring.cy.ts` (5/5): the upload form is wired to `createEntryFromJar.do`; a seeded
  review renders with its rating/title/content. Full set 15+16+17 = **15/15**.

**Phase 3 — substantially COMPLETE** (owner authoring + JAR upload + reviews display all on JS views).
Two items deliberately deferred, each with a real dependency:
- **Review submission** — needs privilege elevation (any logged-in user reviews any module, not
  owner-ACL `jcr` writes) → a dedicated privileged GraphQL mutation/action in `privateappstore`.
- **Rich-text editing** — the metadata editor's richtext fields use plain textareas; swapping in a
  rich-text editor adds an editor dependency.
- JSP edit views are retired at cutover (Phase 5).
- **Exit criteria**: authoring flows run on JS views — ✅ achieved (bar the two deferred items).

### Phase 4 — Page templates & prepackaged site — DONE (2026-05-31)
- ✅ Page templates are React `componentType:"template"` registrations: a generic `jnt:page` `default`
  (Layout + `Area "main"`), the `jnt:page` `site-admin` template, and the `jnt:forgeModule` /
  `jnt:forgePackage` `default` content templates (detail pages). The legacy fixed JSP templates
  (store-home/my-modules/etc.) collapse into the generic template + seeded area content.
- ✅ `settings/import.xml`: the template set's initial content, imported into every site created with
  store-template — a home page (`Area "main"` → a `forgeModulesList`), `home/my-modules` (JAR upload
  + the user's modules), `home/administration` (the admin island via the `site-admin` template), and
  `contents/modules-repository`. So `SiteCreationInfo`/`createSite` yields a complete working store
  with no manual seeding (previously the JS module had no import.xml, so sites came up bare).
- ✅ E2E `18-prepackaged.cy.ts` (3/3): a fresh site (no seeding) renders the home store, the
  My-modules + Administration sub-pages, and a module dropped into the imported modules-repository
  shows on home. Specs 16/17 were refactored to rely on this prepackaged structure (no more manual
  page creation — which had caused a duplicate modules-list). Full set 15+16+17+18 = **18/18**.
- **Exit criteria**: a fresh site provisions entirely on JS templates — ✅ achieved & browser-verified.

### Phase 5 — Cutover & cleanup — CORE DONE (2026-05-31)

**Module cutover — DONE & verified.**
- ✅ `pom.xml`: packaging `bundle` → `pom`; dropped the maven-bundle-plugin + jahia-modules parent
  (OSGi-jar machinery) and `jahia-depends` (deps now in `package.json`'s `jahia` block). The build
  runs the JS pipeline via `exec-maven-plugin` (`npm ci` + `npm run build`) and attaches
  `dist/package.tgz` (`build-helper`) + copies it to `target/` (`antrun`). **`mvn package` produces
  `store-template-3.1.8-SNAPSHOT.tgz`** (verified).
- ✅ Removed the entire legacy `src/main` (284 files, ~4.4 MB): JSP views, the 3 Java classes
  (DeleteScreenshot/ReorderScreenshots → jcr mutations; ForgeFunctions → `versions.ts`), the legacy
  CND (jnt:storeFilter/Footer/Title/Link — unused by the JS module), CSS/LESS/jQuery, `repository.xml`.
- ✅ Package manager standardized on **npm** (`package-lock.json`; dropped `yarn.lock`/`.yarnrc.yml`).
- ✅ Contracts preserved: `moduleList.json` is rendered by **privateappstore** (a JSP/Java module,
  untouched); all the JS module's content types come from privateappstore + core.
- ✅ Verified: `npm run build` + `mvn package` both produce the tgz; deployed; full E2E
  15+16+17+18 = **18/18** green with the legacy `src/main` gone.
- ✅ Runtime provisioning: `privateappstore/tests/assets/provisioning.yml` now installs
  `javascript-modules-engine` (so the store-template tgz deploys on any image).

**CI harness — DONE.**
- ✅ `privateappstore/tests/ci.build.sh` now copies `../../store-template/target/*-SNAPSHOT.tgz`
  (instead of the old `.jar`); `@jahia/cypress` `env.provision` already installs `*-SNAPSHOT.tgz`
  JS modules after the `.jar` modules + the engine (which `provisioning.yml` installs).
- ✅ **Legacy specs needed no rework**: the whole privateappstore suite is contract-level
  (GraphQL/JCR/`moduleList.json`/the privateappstore admin-shell), not store-template JSP DOM.
  Running the full suite against the JS store-template stack → **71/71 across all 18 specs**
  (01–14 legacy + 15–18 new), green.

**Perf / a11y — DONE; CSP — deployment-level.**
- ✅ Perf: total client island payload ~40 KB raw (~12 KB gzipped); React/i18next externalized to the
  engine's shared libs via the importmap. Well under the web/perf budgets.
- ✅ a11y: semantic `header`/`nav`/`main`/`footer`, `aria-label`s, `htmlFor` labels, `:focus-visible`
  styling throughout (an automated axe pass is a good CI add-on).
- CSP: a production nonce-based CSP is a site/deployment config (per `web/security.md`), not a module
  concern — recommended for the hosting site.

**Exit criteria — MET**: no JSP in store-template ✅; ships as a JS module (`mvn package` → tgz) ✅;
full E2E green (71/71) ✅; CI harness installs the tgz ✅.

**Deferred enhancements** (not part of the cutover; real deps): review *submission* (privilege
elevation → a privileged GraphQL mutation in privateappstore) and rich-text editing for the editor's
richtext fields (an editor dependency).

---

## 3. External contracts to preserve (must not break)
- `…/contents/modules-repository.moduleList.json` catalog renderer + version filtering.
- `…/{module}/{version}/file.jar.download` artifact download.
- Module detail page URLs; `*.do` action endpoints still referenced by remote consumers.
- `privateappstore` content types (`jnt:forgeModule`, `jnt:forgeModuleVersion`, …) — unchanged;
  store-template only provides *views* for them.

## 4. Top risks
1. Detail views + lists/filtering + edit forms (the HARD bucket) — the bulk of effort.
2. E2E rework where assertions depend on Bootstrap3 markup.
3. ~~Engine ↔ Jahia version compatibility~~ — **RESOLVED** by the 0bis spike (engine 1.2.0 ACTIVE;
   image pre-ships the engine). Standardized on engine 1.2.0.
4. Java-actions relocation (Phase 3) touching the privateappstore module.

## 5. Immediate next step
Execute **Phase 0** (scaffold + engine provisioning + one rendered page), then **Phase 1**
(chrome + the three admin screens in-site).
