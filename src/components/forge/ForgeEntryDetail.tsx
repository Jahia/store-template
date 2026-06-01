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
import { forgeCategoryNames, forgeIconUrl } from "./forgeCard";
import { str, bool, strValues, jcrWorkspace } from "./nodeProps";
import { sortedVersionNodes } from "./versions";
import Lightbox from "./Lightbox.client";
import ModuleEditor from "./ModuleEditor.client";
import ScreenshotManager from "./ScreenshotManager.client";
import PublishToggle from "./PublishToggle.client";

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
  error: "Save failed — check your permissions and try again.",
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
    error: "Icon upload failed — check your permissions and try again.",
    current: "Current icon",
    none: "—",
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
 * Richtext fields (description, license) are rendered with dangerouslySetInnerHTML.
 * Defense-in-depth against stored XSS: the editor sanitizes with DOMPurify on save
 * and a strict CSP is the backstop (see docs/SECURITY-CSP.md). Content written
 * outside the editor (legacy JSP authoring, direct JCR/GraphQL writes) is NOT
 * sanitized here — enable Jahia's server-side richtext HTML filtering for the store
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

  // Metadata (editable by owners; shown to everyone in Details).
  const categoryOptions = siteCategoryOptions(renderContext.getSite());
  const categoryValue = strValues(node, "j:defaultCategory");
  const categoryNames = forgeCategoryNames(node);
  const tags = strValues(node, "j:tagList");
  const hasDetails = Boolean(license || codeRepository || categoryNames.length || tags.length);

  return (
    <article className={styles.detail}>
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
        <div>
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

      {description && (
        <section className={styles.section}>
          <div className={styles.richtext} dangerouslySetInnerHTML={{ __html: description }} />
        </section>
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

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Versions</h2>
        {versions.length === 0 ? (
          <p className={styles.muted}>No versions published yet.</p>
        ) : (
          <div className={styles.versions}>
            {versions.map((v) => (
              <Render key={v.getIdentifier()} node={v} view="default" readOnly />
            ))}
          </div>
        )}
      </section>

      {hasDetails && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Details</h2>
          <dl className={styles.meta}>
            {categoryNames.length > 0 && (
              <>
                <dt>Category</dt>
                <dd>{categoryNames.join(", ")}</dd>
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
            {license && (
              <>
                <dt>License</dt>
                <dd>
                  <span className={styles.richtext} dangerouslySetInnerHTML={{ __html: license }} />
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
        </section>
      )}

    </article>
  );
}
