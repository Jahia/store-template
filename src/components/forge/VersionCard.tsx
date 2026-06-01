import { Island } from "@jahia/javascript-modules-library";
import styles from "./detail.module.css";
import PublishToggle from "./PublishToggle.client";
import VersionChangelogEditor, { type ChangelogLabels } from "./VersionChangelogEditor.client";

interface PublishLabels {
  publish: string;
  unpublish: string;
  publishing: string;
  publishedState: string;
  draftState: string;
  error: string;
}

/** Owner-only publish control for this version (omitted for non-owners). */
interface VersionPublishControl {
  path: string;
  workspace: "EDIT" | "LIVE";
  labels: PublishLabels;
}

/** Owner-only changelog editor for this version (omitted for non-owners). */
interface VersionChangelogControl {
  path: string;
  workspace: "EDIT" | "LIVE";
  language: string;
  labels: ChangelogLabels;
}

export interface VersionCardProps {
  versionNumber: string;
  published: boolean;
  changeLogHtml: string;
  downloadUrl: string | null;
  publishControl?: VersionPublishControl | null;
  changelogControl?: VersionChangelogControl | null;
}

/** Presentational card for one module/package version (changelog is sanitized richtext). */
export function VersionCard({
  versionNumber,
  published,
  changeLogHtml,
  downloadUrl,
  publishControl,
  changelogControl,
}: Readonly<VersionCardProps>): JSX.Element {
  return (
    <div className={styles.version} data-forge-version="">
      <div className={styles.versionHead}>
        <span className={styles.versionNumber}>{versionNumber}</span>
        {publishControl ? (
          <Island
            component={PublishToggle}
            props={{
              path: publishControl.path,
              published,
              workspace: publishControl.workspace,
              scope: "version",
              labels: publishControl.labels,
            }}
          />
        ) : (
          !published && <span className={styles.draft}>draft</span>
        )}
        {downloadUrl && (
          <a className={styles.download} href={downloadUrl}>
            Download
          </a>
        )}
      </div>
      {changeLogHtml && (
        <div className={styles.changelog} dangerouslySetInnerHTML={{ __html: changeLogHtml }} />
      )}
      {changelogControl && (
        <Island
          component={VersionChangelogEditor}
          props={{
            path: changelogControl.path,
            workspace: changelogControl.workspace,
            language: changelogControl.language,
            value: changeLogHtml,
            labels: changelogControl.labels,
          }}
        />
      )}
    </div>
  );
}
