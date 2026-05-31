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
import { forgeIconUrl } from "./forgeCard";
import { str, bool } from "./nodeProps";
import { sortedVersionNodes } from "./versions";
import Lightbox from "./Lightbox.client";
import ModuleEditor from "./ModuleEditor.client";

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
};

function screenshots(node: JCRNodeWrapper): string[] {
  if (!node.hasNode("screenshots")) return [];
  return getChildNodes(node.getNode("screenshots"), 20, 0, (n) => n.isNodeType("jnt:file")).map(
    (f) => buildNodeUrl(f),
  );
}

/**
 * Read-only detail of a forge module/package: header, description, video,
 * screenshots (lightbox), versions (rendered via their `default` view) and
 * metadata. Richtext fields are rendered as HTML — Jahia sanitizes richtext on
 * save. (Edit mode and reviews come in Phase 3.)
 */
export function ForgeEntryDetail({ node }: { node: JCRNodeWrapper }): JSX.Element {
  const { currentResource } = useServerContext();
  const title = str(node, "jcr:title") || node.getName();
  const description = str(node, "description");
  const license = str(node, "license");
  const codeRepository = str(node, "codeRepository");
  const status = str(node, "status");
  const supported = bool(node, "supportedByJahia");
  const reviewed = bool(node, "reviewedByJahia");
  const icon = forgeIconUrl(node);
  const shots = screenshots(node);
  const versions = sortedVersionNodes(node);
  const videoNode = node.hasNode("video") ? node.getNode("video") : null;
  const canEdit = node.hasPermission("jcr:write");
  const language = currentResource.getLocale().getLanguage();

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
        <Island
          component={ModuleEditor}
          props={{
            path: node.getPath(),
            language,
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
            labels: EDITOR_LABELS,
          }}
        />
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
          <Island component={Lightbox} props={{ images: shots }} />
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

      {(license || codeRepository) && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Details</h2>
          <dl className={styles.meta}>
            {codeRepository && (
              <>
                <dt>Source</dt>
                <dd>
                  <a href={codeRepository}>{codeRepository}</a>
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
          </dl>
        </section>
      )}
    </article>
  );
}
