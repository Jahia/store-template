import {
  buildNodeUrl,
  getChildNodes,
  Island,
  Render,
  useServerContext,
} from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import { useTranslation } from "react-i18next";
import clsx from "clsx";
import styles from "./detail.module.css";
import { forgeAuthor, forgeCategoryNames, forgeIconUrl } from "./forgeCard";
import { str, bool, strValues, jcrWorkspace, isoDay } from "./nodeProps";
import { sanitizeHtml } from "./sanitizeHtml";
import { requiredJahiaVersion, sortedVersionNodes, versionDownloadUrl } from "./versions";
import { forgeCategoryOptions } from "./forgeFacets";
import { buildEditorLabels } from "./editorLabels";
import Lightbox from "./Lightbox.client";
import ModuleEditor from "./ModuleEditor.client";
import PublishToggle from "./PublishToggle.client";
import DetailTabs from "./DetailTabs.client";
import VersionsDialog from "./VersionsDialog.client";
import FileUploadForm from "~/components/FileUpload/FileUpload.client";

interface TabDef {
  id: string;
  label: string;
}

/** Common props for a server-rendered tabpanel that DetailTabs toggles. */
function panelProps(id: string, defaultTab: string) {
  return {
    id: `detail-panel-${id}`,
    role: "tabpanel" as const,
    "aria-labelledby": `detail-tab-${id}`,
    "data-detail-panel": id,
    // SSR hides all but the first panel so the active panel matches on hydration.
    hidden: id !== defaultTab,
  };
}

/**
 * Module status values offered in the editor — a deliberate subset of the
 * `jmix:forgeElement` `status` choicelist: `prereleased` is intentionally omitted
 * from the UI (the CND still permits it for existing/migrated data).
 */
const STATUS_OPTIONS = ["community", "labs", "supported", "legacy"];

/** Allowed author-display modes (jnt:forgeModule/Package `authorNameDisplayedAs` choicelist). */
const AUTHOR_DISPLAY_OPTIONS = ["username", "fullName", "organisation"];

function screenshotItems(node: JCRNodeWrapper): { name: string; url: string }[] {
  if (!node.hasNode("screenshots")) return [];
  return getChildNodes(node.getNode("screenshots"), 20, 0, (n) => n.isNodeType("jnt:file")).map(
    (f) => ({ name: f.getName(), url: buildNodeUrl(f) }),
  );
}

/** Only http(s) URLs are safe to render as a link href (blocks stored javascript:/data: URLs). */
function isHttpUrl(url: string): boolean {
  return /^https?:\/\//i.test(url.trim());
}

/**
 * Detail of a forge module/package: header, description, video, screenshots
 * (lightbox), versions (rendered via their `default` view), metadata and an
 * in-site editor (owners).
 *
 * Richtext fields (description, license, howToInstall, FAQ) are rendered with
 * dangerouslySetInnerHTML. Defense-in-depth against stored XSS, in layers:
 *   1. every richtext value is sanitized server-side at render via sanitizeHtml()
 *      - this is the only layer that covers ALL write paths, including direct
 *      JCR/GraphQL writes that bypass the editor (SECURITY-571 B2);
 *   2. the in-site editor also sanitizes with DOMPurify on save;
 *   3. a strict CSP is the backstop (see docs/SECURITY-CSP.md).
 */
export function ForgeEntryDetail({ node }: Readonly<{ node: JCRNodeWrapper }>): JSX.Element {
  const { t } = useTranslation();
  const { currentResource, renderContext } = useServerContext();

  // Labels for the owner islands are built server-side from t() and passed in as
  // props (the client islands never import react-i18next - they survive hydration
  // regardless of which keys SSR happened to collect).
  const PUBLISH_LABELS = {
    publish: t("publish.module.publish"),
    unpublish: t("publish.module.unpublish"),
    publishing: t("publish.publishing"),
    publishedState: t("publish.publishedState"),
    draftState: t("publish.draftState"),
    error: t("publish.module.error"),
  };

  const EDITOR_LABELS = buildEditorLabels(t);

  // Labels for the owner-only "upload a new version" form on the detail page. Posts
  // to the same createEntryFromJar action as the my-modules upload - the action
  // upserts (matches the module by groupId+name in the package) and appends the
  // version - so the only thing missing was an entry point on the module's own page.
  const ADD_VERSION_LABELS = {
    fileLabel: t("addVersion.fileLabel"),
    submit: t("addVersion.submit"),
    submitting: t("addVersion.submitting"),
    pickFile: t("addVersion.pickFile"),
    error: t("addVersion.error"),
  };

  const title = str(node, "jcr:title") || node.getName();
  // Richtext fields are sanitized server-side before they reach the DOM (covers
  // direct GraphQL/JCR writes that bypass the editor — SECURITY-571 B2).
  const description = sanitizeHtml(str(node, "description"));
  const license = sanitizeHtml(str(node, "license"));
  const codeRepository = str(node, "codeRepository");
  const status = str(node, "status");
  const icon = forgeIconUrl(node);
  const shots = screenshotItems(node);
  const screenshotsPath = node.hasNode("screenshots") ? node.getNode("screenshots").getPath() : "";
  const versions = sortedVersionNodes(node);
  const videoNode = node.hasNode("video") ? node.getNode("video") : null;
  const videoProvider = videoNode ? str(videoNode, "provider") : "";
  const videoId = videoNode ? str(videoNode, "identifier") : "";
  const canEdit = node.hasPermission("jcr:write");
  const language = currentResource.getLocale().getLanguage();
  const published = bool(node, "published");
  const workspace = jcrWorkspace(node);

  // Owners can add a version by uploading its package from this page. The upload
  // posts to createEntryFromJar on modules-repository (resolved in the rendered
  // workspace, exactly like the my-modules upload form), which upserts the module
  // and appends the version. Null for non-owners or if the repo is unavailable.
  const repoPath = `${renderContext.getSite().getPath()}/contents/modules-repository`;
  const session = node.getSession();
  const uploadActionUrl =
    canEdit && session.nodeExists(repoPath)
      ? `${buildNodeUrl(session.getNode(repoPath)).replace(/\.html$/, "")}.createEntryFromJar.do`
      : null;

  // Metadata (editable by owners; shown to everyone in the Information panel).
  // Resolve the editor's category choices from the SAME source as the storefront
  // facet rail + the admin UI: the per-site OSGi forge config's root category
  // (not the legacy JCR `rootCategory` property, which the settings migration left
  // unset — that mismatch is why the editor showed "no categories configured").
  const categoryOptions = forgeCategoryOptions(renderContext.getSite().getSiteKey(), session);
  const categoryValue = strValues(node, "j:defaultCategory");
  const categoryNames = forgeCategoryNames(node);
  const tags = strValues(node, "j:tagList");
  const howToInstall = sanitizeHtml(str(node, "howToInstall"));
  const faq = sanitizeHtml(str(node, "FAQ"));
  const moduleId = node.getName();
  const groupId = str(node, "groupId");
  const author = forgeAuthor(node);
  const authorURL = str(node, "authorURL");
  const updated = isoDay(node, "jcr:lastModified");
  const requiresJahia = requiredJahiaVersion(versions[0]);
  // Prominent download for the newest version (mirrors store.jahia.com's title CTA).
  const latestVersionNumber = versions[0] ? str(versions[0], "versionNumber") : "";
  const latestDownloadUrl = versions[0] ? versionDownloadUrl(versions[0]) : null;

  // The detail sections are grouped into tabs (DetailTabs island) for easier
  // browsing. Only include a tab when it has content; the first one is the SSR
  // default. Overview = description/video/screenshots; Installation = how-to + FAQ.
  const hasOverview = Boolean(description || videoNode || shots.length);
  const hasInstall = Boolean(howToInstall || faq);
  const hasLicense = Boolean(license);
  // Versions are no longer a tab — they open in a popup (VersionsDialog) from the header.
  const tabs: TabDef[] = [
    ...(hasOverview ? [{ id: "overview", label: t("detail.tabs.overview") }] : []),
    ...(hasInstall ? [{ id: "install", label: t("detail.tabs.install") }] : []),
    ...(hasLicense ? [{ id: "license", label: t("detail.tabs.license") }] : []),
  ];
  // May be empty (a module with only versions) — guard the tablist + default panel.
  const defaultTab = tabs[0]?.id ?? "";

  return (
    <article className={styles.detail} data-detail="">
      <header className={styles.head}>
        <div className={styles.headIcon}>
          {icon ? (
            <img src={icon} alt="" width="80" height="80" />
          ) : (
            <span className={styles.headIconPlaceholder} aria-hidden="true">
              {title.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div className={styles.headMain}>
          <h1 className={styles.title}>{title}</h1>
          <div className={styles.badges}>
            {status && (
              <span className={clsx(styles.badge, styles.status)} data-status={status}>
                {status}
              </span>
            )}
          </div>
        </div>
        {/* Top-right corner: the latest-version download CTA + the "Versions" popup trigger. */}
        <div className={styles.headActions}>
          {latestDownloadUrl && (
            <a className={styles.headDownload} href={latestDownloadUrl} data-latest-download="">
              {latestVersionNumber
                ? t("detail.downloadVersion", { version: latestVersionNumber })
                : t("detail.download")}
            </a>
          )}
          {versions.length > 0 && (
            <Island
              component={VersionsDialog}
              props={{ buttonLabel: t("detail.versions.open", { count: versions.length }) }}
            />
          )}
        </div>
      </header>

      {canEdit && (
        <div className={styles.ownerBar} data-owner-bar="">
          <Island
            component={PublishToggle}
            props={{ path: node.getPath(), published, workspace, scope: "module", labels: PUBLISH_LABELS }}
          />
          <Island
            component={ModuleEditor}
            props={{
              path: node.getPath(),
              workspace,
              language,
              iconUrl: icon,
              values: {
                "jcr:title": title,
                description,
                howToInstall,
                FAQ: faq,
                license,
                authorEmail: str(node, "authorEmail"),
                authorURL: str(node, "authorURL"),
                codeRepository,
              },
              status,
              statusOptions: STATUS_OPTIONS,
              authorDisplay: str(node, "authorNameDisplayedAs") || "username",
              authorDisplayOptions: AUTHOR_DISPLAY_OPTIONS,
              categoryOptions,
              categoryValue,
              tags,
              screenshotsPath,
              screenshots: shots,
              videoProvider,
              videoId,
              hasVideo: Boolean(videoNode),
              labels: EDITOR_LABELS,
            }}
          />
        </div>
      )}

      <div className={styles.body}>
        {/* Persistent "Information" rail — always visible (not behind a tab) as in the old UI.
            A <div>, not <aside>: a complementary landmark nested in <main> trips the axe AAA gate.
            DOM order is main-first (reading order); CSS grid places this rail on the left. */}
        <div className={styles.sidebar} data-detail-info="">
          <h2 className={styles.sidebarTitle}>{t("detail.tabs.information")}</h2>
          <dl className={styles.meta}>
            <dt>{t("detail.meta.moduleId")}</dt>
            <dd>{moduleId}</dd>
            {groupId && (
              <>
                <dt>{t("detail.meta.groupId")}</dt>
                <dd>{groupId}</dd>
              </>
            )}
            {status && (
              <>
                <dt>{t("detail.meta.status")}</dt>
                <dd className={styles.metaStatus}>{status}</dd>
              </>
            )}
            {categoryNames.length > 0 && (
              <>
                <dt>{t("detail.meta.category")}</dt>
                <dd>{categoryNames.join(", ")}</dd>
              </>
            )}
            {author && (
              <>
                <dt>{t("detail.meta.author")}</dt>
                <dd>{author}</dd>
              </>
            )}
            {isHttpUrl(authorURL) && (
              <>
                <dt>{t("detail.meta.developerWebsite")}</dt>
                <dd>
                  <a href={authorURL} rel="noopener noreferrer nofollow" target="_blank">
                    {authorURL}
                  </a>
                </dd>
              </>
            )}
            {requiresJahia && (
              <>
                <dt>{t("detail.meta.requiresJahia")}</dt>
                <dd>{requiresJahia}</dd>
              </>
            )}
            {updated && (
              <>
                <dt>{t("detail.meta.updated")}</dt>
                <dd>{updated}</dd>
              </>
            )}
            {codeRepository && (
              <>
                <dt>{t("detail.meta.source")}</dt>
                <dd>
                  {isHttpUrl(codeRepository) ? (
                    <a href={codeRepository} rel="noopener noreferrer nofollow" target="_blank">
                      {codeRepository}
                    </a>
                  ) : (
                    codeRepository
                  )}
                </dd>
              </>
            )}
            {tags.length > 0 && (
              <>
                <dt>{t("detail.meta.tags")}</dt>
                <dd>
                  <ul className={styles.tagList} data-tag-list="">
                    {tags.map((tag) => (
                      <li key={tag} className={styles.tag}>
                        {tag}
                      </li>
                    ))}
                  </ul>
                </dd>
              </>
            )}
          </dl>
        </div>

        <div className={styles.main}>
          {tabs.length > 0 && (
            <Island component={DetailTabs} props={{ tabs, ariaLabel: t("detail.tabs.ariaLabel") }} />
          )}

      {hasOverview && (
        <div {...panelProps("overview", defaultTab)} className={styles.panel}>
          {description && (
            <div className={styles.richtext} dangerouslySetInnerHTML={{ __html: description }} />
          )}
          {videoNode && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>{t("detail.sections.video")}</h2>
              <Render node={videoNode} view="default" readOnly />
            </section>
          )}
          {shots.length > 0 && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>{t("detail.sections.screenshots")}</h2>
              {/* Display-only here; owners manage screenshots in the editor's Media tab. */}
              <Island
                component={Lightbox}
                props={{
                  images: shots.map((s) => s.url),
                  labels: {
                    open: t("lightbox.open"),
                    close: t("lightbox.close"),
                    previous: t("lightbox.previous"),
                    next: t("lightbox.next"),
                  },
                }}
              />
            </section>
          )}
        </div>
      )}

      {hasInstall && (
        <div {...panelProps("install", defaultTab)} className={styles.panel}>
          {howToInstall && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>{t("detail.sections.howToInstall")}</h2>
              <div className={styles.richtext} dangerouslySetInnerHTML={{ __html: howToInstall }} />
            </section>
          )}
          {faq && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>{t("detail.sections.faq")}</h2>
              <div className={styles.richtext} dangerouslySetInnerHTML={{ __html: faq }} />
            </section>
          )}
        </div>
      )}

      {hasLicense && (
        <div {...panelProps("license", defaultTab)} className={styles.panel}>
          <div className={styles.richtext} dangerouslySetInnerHTML={{ __html: license }} />
        </div>
      )}
        </div>
      </div>

      {/* Versions popup, opened by the header "Versions" button (VersionsDialog island). A native
          <dialog> gives a focus trap, Escape-to-close and an inert backdrop for free; its content
          (Jahia version views + the owner upload form) is server-rendered. */}
      <dialog
        className={styles.versionsDialog}
        data-versions-dialog=""
        aria-modal="true"
        aria-labelledby="versions-dialog-title"
      >
        <div className={styles.dialogHead}>
          <h2 id="versions-dialog-title" className={styles.dialogTitle}>
            {t("detail.tabs.versions")}
          </h2>
          <form method="dialog">
            <button type="submit" className={styles.dialogClose} aria-label={t("detail.versions.close")}>
              <span aria-hidden="true">×</span>
            </button>
          </form>
        </div>
        <div className={styles.dialogBody}>
          {versions.length === 0 ? (
            <p className={styles.muted}>{t("detail.versions.none")}</p>
          ) : (
            <div className={styles.versions}>
              {versions.map((v) => (
                <Render key={v.getIdentifier()} node={v} view="default" readOnly />
              ))}
            </div>
          )}
          {uploadActionUrl && (
            <section className={styles.section} data-add-version="">
              <h3 className={styles.sectionTitle}>{t("detail.versions.uploadTitle")}</h3>
              <p className={styles.muted}>{t("detail.versions.uploadHelp")}</p>
              <Island
                component={FileUploadForm}
                props={{
                  actionUrl: uploadActionUrl,
                  backUrl: buildNodeUrl(node),
                  accept: ".jar",
                  labels: ADD_VERSION_LABELS,
                }}
              />
            </section>
          )}
        </div>
      </dialog>
    </article>
  );
}
