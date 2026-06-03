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
import Lightbox from "./Lightbox.client";
import ModuleEditor from "./ModuleEditor.client";
import ScreenshotManager from "./ScreenshotManager.client";
import PublishToggle from "./PublishToggle.client";
import DetailTabs from "./DetailTabs.client";
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

/** Allowed module status values (jmix:forgeElement `status` choicelist). */
const STATUS_OPTIONS = ["community", "labs", "prereleased", "supported", "legacy"];

/**
 * Categories a developer can file a module under: the children of the site's
 * configured root category (Store administration → Categories). Empty if no root
 * category is set. Reading fails soft so the editor still renders without it.
 */
function siteCategoryOptions(site: JCRNodeWrapper): { uuid: string; name: string }[] {
  try {
    if (!site.hasProperty("rootCategory")) return [];
    const root = site.getProperty("rootCategory").getNode() as unknown as JCRNodeWrapper;
    if (!root) return [];
    return getChildNodes(root, 200, 0, (n) => n.isNodeType("jnt:category")).map((c) => ({
      uuid: c.getIdentifier(),
      name: c.getDisplayableName(),
    }));
  } catch {
    return [];
  }
}

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

  const EDITOR_LABELS = {
    edit: t("editor.edit"),
    save: t("editor.save"),
    saving: t("editor.saving"),
    cancel: t("editor.cancel"),
    saved: t("editor.saved"),
    error: t("editor.error"),
    title: t("editor.title"),
    description: t("editor.description"),
    howToInstall: t("editor.howToInstall"),
    faq: t("editor.faq"),
    license: t("editor.license"),
    authorEmail: t("editor.authorEmail"),
    authorURL: t("editor.authorURL"),
    codeRepository: t("editor.codeRepository"),
    tabGeneral: t("editor.tabGeneral"),
    tabDescription: t("editor.tabDescription"),
    tabInstall: t("editor.tabInstall"),
    tabLicense: t("editor.tabLicense"),
    tabAuthor: t("editor.tabAuthor"),
    tablist: t("editor.tablist"),
    loading: t("editor.loading"),
    icon: {
      label: t("editor.icon.label"),
      choose: t("editor.icon.choose"),
      upload: t("editor.icon.upload"),
      uploading: t("editor.icon.uploading"),
      uploaded: t("editor.icon.uploaded"),
      error: t("editor.icon.error"),
      current: t("editor.icon.current"),
      none: t("editor.icon.none"),
      tooLarge: t("editor.icon.tooLarge"),
      invalidType: t("editor.icon.invalidType"),
    },
    metadata: {
      status: t("editor.metadata.status"),
      category: t("editor.metadata.category"),
      noCategories: t("editor.metadata.noCategories"),
      tags: t("editor.metadata.tags"),
      tag: {
        add: t("editor.metadata.tag.add"),
        remove: t("editor.metadata.tag.remove"),
        placeholder: t("editor.metadata.tag.placeholder"),
      },
    },
  };

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

  // Labels for the owner screenshot manager island (passed in as props).
  const SCREENSHOT_LABELS = {
    empty: t("screenshots.empty"),
    moveUp: t("screenshots.moveUp"),
    moveDown: t("screenshots.moveDown"),
    delete: t("screenshots.delete"),
    confirmPrompt: t("screenshots.confirmPrompt"),
    confirm: t("screenshots.confirm"),
    cancel: t("screenshots.cancel"),
    error: t("screenshots.error"),
  };

  const title = str(node, "jcr:title") || node.getName();
  // Richtext fields are sanitized server-side before they reach the DOM (covers
  // direct GraphQL/JCR writes that bypass the editor — SECURITY-571 B2).
  const description = sanitizeHtml(str(node, "description"));
  const license = sanitizeHtml(str(node, "license"));
  const codeRepository = str(node, "codeRepository");
  const status = str(node, "status");
  const supported = bool(node, "supportedByJahia");
  const reviewed = bool(node, "reviewedByJahia");
  const icon = forgeIconUrl(node);
  const shots = screenshotItems(node);
  const screenshotsPath = node.hasNode("screenshots") ? node.getNode("screenshots").getPath() : "";
  const versions = sortedVersionNodes(node);
  const videoNode = node.hasNode("video") ? node.getNode("video") : null;
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
  const categoryOptions = siteCategoryOptions(renderContext.getSite());
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
  const tabs: TabDef[] = [
    ...(hasOverview ? [{ id: "overview", label: t("detail.tabs.overview") }] : []),
    { id: "versions", label: t("detail.tabs.versions") },
    ...(hasInstall ? [{ id: "install", label: t("detail.tabs.install") }] : []),
    ...(hasLicense ? [{ id: "license", label: t("detail.tabs.license") }] : []),
  ];
  const defaultTab = tabs[0].id;

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
            {supported && (
              <span className={clsx(styles.badge, styles.supported)}>{t("detail.badge.supported")}</span>
            )}
            {reviewed && (
              <span className={clsx(styles.badge, styles.reviewed)}>{t("detail.badge.reviewed")}</span>
            )}
          </div>
          {latestDownloadUrl && (
            <a className={styles.headDownload} href={latestDownloadUrl} data-latest-download="">
              {latestVersionNumber
                ? t("detail.downloadVersion", { version: latestVersionNumber })
                : t("detail.download")}
            </a>
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
              categoryOptions,
              categoryValue,
              tags,
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
          <Island component={DetailTabs} props={{ tabs, ariaLabel: t("detail.tabs.ariaLabel") }} />

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
              {canEdit ? (
                <Island
                  component={ScreenshotManager}
                  props={{ path: screenshotsPath, items: shots, labels: SCREENSHOT_LABELS }}
                />
              ) : (
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
              )}
            </section>
          )}
        </div>
      )}

      <div {...panelProps("versions", defaultTab)} className={styles.panel}>
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
            <h2 className={styles.sectionTitle}>{t("detail.versions.uploadTitle")}</h2>
            <p className={styles.muted}>{t("detail.versions.uploadHelp")}</p>
            <Island
              component={FileUploadForm}
              props={{
                actionUrl: uploadActionUrl,
                backUrl: buildNodeUrl(node),
                accept: ".jar,.war",
                labels: ADD_VERSION_LABELS,
              }}
            />
          </section>
        )}
      </div>

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
    </article>
  );
}
