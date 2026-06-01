import {
  buildNodeUrl,
  getChildNodes,
  Island,
  Render,
  useServerContext,
} from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import clsx from "clsx";
import styles from "./detail.module.css";
import { forgeAuthor, forgeCategoryNames, forgeIconUrl } from "./forgeCard";
import { str, bool, strValues, jcrWorkspace } from "./nodeProps";
import { sortedVersionNodes, versionDownloadUrl } from "./versions";
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

const PUBLISH_LABELS = {
  publish: "Publish module",
  unpublish: "Unpublish module",
  publishing: "Saving…",
  publishedState: "Published",
  draftState: "Draft",
  error: "Could not change the published state.",
};

const EDITOR_LABELS = {
  edit: "Edit module",
  save: "Save",
  saving: "Saving…",
  cancel: "Cancel",
  saved: "Saved",
  error: "Save failed - check your permissions and try again.",
  title: "Title",
  description: "Description",
  howToInstall: "How to install",
  faq: "FAQ",
  license: "License",
  authorEmail: "Author email",
  authorURL: "Author URL",
  codeRepository: "Code repository",
  tabGeneral: "General",
  tabDescription: "Description",
  tabInstall: "Install & FAQ",
  tabLicense: "License",
  tabAuthor: "Author & links",
  tablist: "Module fields",
  icon: {
    label: "Icon",
    choose: "Choose an icon image",
    upload: "Upload icon",
    uploading: "Uploading…",
    uploaded: "Icon uploaded",
    error: "Icon upload failed - check your permissions and try again.",
    current: "Current icon",
    none: "-",
    tooLarge: "Image is too large (max 2 MB).",
    invalidType: "Please choose an image file.",
  },
  metadata: {
    status: "Status",
    category: "Category",
    noCategories: "No categories are configured for this store yet.",
    tags: "Tags",
    tag: { add: "Add tag", remove: "Remove tag", placeholder: "Add a tag…" },
  },
};

/** Allowed module status values (jmix:forgeElement `status` choicelist). */
const STATUS_OPTIONS = ["community", "labs", "prereleased", "supported", "legacy"];

/**
 * Labels for the owner-only "upload a new version" form on the detail page. Posts
 * to the same createEntryFromJar action as the my-modules upload - the action
 * upserts (matches the module by groupId+name in the package) and appends the
 * version - so the only thing missing was an entry point on the module's own page.
 */
const ADD_VERSION_LABELS = {
  fileLabel: "New version package (.jar / .war)",
  submit: "Upload new version",
  submitting: "Uploading…",
  pickFile: "Please choose a module package first.",
  error: "Upload failed - please try again.",
};

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

/** Displayable name of a version's required Jahia version (weakreference), or "". */
function requiredJahiaVersion(version: JCRNodeWrapper | undefined): string {
  if (!version) return "";
  try {
    if (version.hasProperty("requiredVersion")) {
      const ref = version.getProperty("requiredVersion").getNode() as unknown as JCRNodeWrapper;
      // The required-version nodes are named "version-8.1.6.2"; show just "8.1.6.2".
      return ref ? ref.getDisplayableName().replace(/^version-/, "") : "";
    }
  } catch {
    // Dangling reference.
  }
  return "";
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
 * Richtext fields (description, license) are rendered with dangerouslySetInnerHTML.
 * Defense-in-depth against stored XSS: the editor sanitizes with DOMPurify on save
 * and a strict CSP is the backstop (see docs/SECURITY-CSP.md). Content written
 * outside the editor (legacy JSP authoring, direct JCR/GraphQL writes) is NOT
 * sanitized here - enable Jahia's server-side richtext HTML filtering for the store
 * site to cover those paths.
 */
export function ForgeEntryDetail({ node }: Readonly<{ node: JCRNodeWrapper }>): JSX.Element {
  const { currentResource, renderContext } = useServerContext();
  const title = str(node, "jcr:title") || node.getName();
  const description = str(node, "description");
  const license = str(node, "license");
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
  const howToInstall = str(node, "howToInstall");
  const faq = str(node, "FAQ");
  const moduleId = node.getName();
  const groupId = str(node, "groupId");
  const author = forgeAuthor(node);
  const authorURL = str(node, "authorURL");
  const updated = node.hasProperty("jcr:lastModified")
    ? node.getProperty("jcr:lastModified").getString().slice(0, 10)
    : "";
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
    ...(hasOverview ? [{ id: "overview", label: "Overview" }] : []),
    { id: "information", label: "Information" },
    { id: "versions", label: "Versions" },
    ...(hasInstall ? [{ id: "install", label: "Installation" }] : []),
    ...(hasLicense ? [{ id: "license", label: "License" }] : []),
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
            {supported && <span className={clsx(styles.badge, styles.supported)}>Supported by Jahia</span>}
            {reviewed && <span className={clsx(styles.badge, styles.reviewed)}>Reviewed by Jahia</span>}
          </div>
          {latestDownloadUrl && (
            <a className={styles.headDownload} href={latestDownloadUrl} data-latest-download="">
              Download{latestVersionNumber ? ` ${latestVersionNumber}` : ""}
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
                howToInstall: str(node, "howToInstall"),
                FAQ: str(node, "FAQ"),
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

      <Island component={DetailTabs} props={{ tabs, ariaLabel: "Module sections" }} />

      {hasOverview && (
        <div {...panelProps("overview", defaultTab)} className={styles.panel}>
          {description && (
            <div className={styles.richtext} dangerouslySetInnerHTML={{ __html: description }} />
          )}
          {videoNode && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Video</h2>
              <Render node={videoNode} view="default" readOnly />
            </section>
          )}
          {shots.length > 0 && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Screenshots</h2>
              {canEdit ? (
                <Island component={ScreenshotManager} props={{ path: screenshotsPath, items: shots }} />
              ) : (
                <Island component={Lightbox} props={{ images: shots.map((s) => s.url) }} />
              )}
            </section>
          )}
        </div>
      )}

      <div {...panelProps("information", defaultTab)} className={styles.panel}>
        <dl className={styles.meta}>
          <dt>Module ID</dt>
          <dd>{moduleId}</dd>
          {groupId && (
            <>
              <dt>Group ID</dt>
              <dd>{groupId}</dd>
            </>
          )}
          {status && (
            <>
              <dt>Status</dt>
              <dd className={styles.metaStatus}>{status}</dd>
            </>
          )}
          {categoryNames.length > 0 && (
            <>
              <dt>Category</dt>
              <dd>{categoryNames.join(", ")}</dd>
            </>
          )}
          {author && (
            <>
              <dt>Author</dt>
              <dd>{author}</dd>
            </>
          )}
          {isHttpUrl(authorURL) && (
            <>
              <dt>Developer website</dt>
              <dd>
                <a href={authorURL} rel="noopener noreferrer nofollow" target="_blank">
                  {authorURL}
                </a>
              </dd>
            </>
          )}
          {requiresJahia && (
            <>
              <dt>Requires Jahia</dt>
              <dd>{requiresJahia}</dd>
            </>
          )}
          {updated && (
            <>
              <dt>Updated</dt>
              <dd>{updated}</dd>
            </>
          )}
          {codeRepository && (
            <>
              <dt>Source</dt>
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
              <dt>Tags</dt>
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

      <div {...panelProps("versions", defaultTab)} className={styles.panel}>
        {versions.length === 0 ? (
          <p className={styles.muted}>No versions published yet.</p>
        ) : (
          <div className={styles.versions}>
            {versions.map((v) => (
              <Render key={v.getIdentifier()} node={v} view="default" readOnly />
            ))}
          </div>
        )}
        {uploadActionUrl && (
          <section className={styles.section} data-add-version="">
            <h2 className={styles.sectionTitle}>Upload a new version</h2>
            <p className={styles.muted}>
              Upload a .jar or .war whose module name and group ID match this module to add it as a
              new version.
            </p>
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
              <h2 className={styles.sectionTitle}>How to install</h2>
              <div className={styles.richtext} dangerouslySetInnerHTML={{ __html: howToInstall }} />
            </section>
          )}
          {faq && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>FAQ</h2>
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
    </article>
  );
}
