import { Island } from "@jahia/javascript-modules-library";
import styles from "./detail.module.css";
import PublishToggle from "./PublishToggle.client";
import RequestValidationButton, { type RequestValidationLabels } from "./RequestValidationButton.client";
import { ValidationSummary, type ValidationLabels } from "./ValidationBadge";
import type { Validation } from "./validation";
import VersionChangelogEditor, { type ChangelogLabels } from "./VersionChangelogEditor.client";
import VersionDeleteButton, { type VersionDeleteLabels } from "./VersionDeleteButton.client";

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

/** Owner-only delete control for this version (omitted for non-owners). */
interface VersionDeleteControl {
  path: string;
  workspace: "EDIT" | "LIVE";
  labels: VersionDeleteLabels;
}

export interface VersionCardProps {
  versionNumber: string;
  published: boolean;
  changeLogHtml: string;
  downloadUrl: string | null;
  /** Translated "Download" link label (computed server-side). */
  downloadLabel: string;
  /** Translated "draft" badge label, shown to non-owners on unpublished versions. */
  draftLabel: string;
  /** Jahia version this release requires (e.g. "8.1.6.2"), or "" to omit. */
  requiresJahia: string;
  /** Translated "Requires Jahia" label. */
  requiresJahiaLabel: string;
  /** Release date as "YYYY-MM-DD" (the upload date, not the last edit), or "" to omit. */
  released: string;
  /** Translated "Released" label. */
  releasedLabel: string;
  /** The git tag of the version and its page on the git host, when the version declares one. */
  tag?: { name: string; url: string | null } | null;
  /** Translated "Tag" label. */
  tagLabel: string;
  /** The page of the changelog of the version on the git host, or null. */
  changelogUrl?: string | null;
  /** Translated "Changelog" link text. */
  changelogLabel: string;
  publishControl?: VersionPublishControl | null;
  changelogControl?: VersionChangelogControl | null;
  deleteControl?: VersionDeleteControl | null;
  /** The validation of the version, null when it was never validated, undefined to show nothing. */
  validation?: Validation | null;
  validationLabels?: ValidationLabels;
  /** Shown in place of the publish control while the version is not approved. */
  publishBlocked?: string | null;
  /** Owner-only control that runs the checks again (omitted for visitors). */
  validationControl?: { siteKey: string; moduleName: string; labels: RequestValidationLabels } | null;
}

/** Presentational card for one module/package version (changelog is sanitized richtext). */
export function VersionCard({
  versionNumber,
  published,
  changeLogHtml,
  downloadUrl,
  downloadLabel,
  draftLabel,
  requiresJahia,
  requiresJahiaLabel,
  released,
  releasedLabel,
  tag,
  tagLabel,
  changelogUrl,
  changelogLabel,
  publishControl,
  changelogControl,
  deleteControl,
  validation,
  validationLabels,
  publishBlocked,
  validationControl,
}: Readonly<VersionCardProps>): JSX.Element {
  return (
    <div className={styles.version} data-forge-version="">
      <div className={styles.versionHead}>
        <span className={styles.versionNumber}>{versionNumber}</span>
        {publishBlocked && (
          <span className={styles.draft} data-publish-blocked="">
            {publishBlocked}
          </span>
        )}
        {publishControl && !publishBlocked ? (
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
          !published && !publishBlocked && <span className={styles.draft}>{draftLabel}</span>
        )}
        {validationControl &&
          (validation?.status === "review" && validationLabels ? (
            // A check waits for a human: nothing to run again until the answer is recorded.
            <button
              type="button"
              className="store-btn store-btn--ghost store-btn--sm"
              disabled
              data-request-validation={versionNumber}
              data-request-validation-waiting=""
            >
              {validationLabels.statuses.review}
            </button>
          ) : (
            <Island
              component={RequestValidationButton}
              props={{
                siteKey: validationControl.siteKey,
                moduleName: validationControl.moduleName,
                version: versionNumber,
                labels: validationControl.labels,
              }}
            />
          ))}
        {downloadUrl && (
          <a className={styles.download} href={downloadUrl}>
            {downloadLabel}
          </a>
        )}
        {deleteControl && (
          <Island
            component={VersionDeleteButton}
            props={{
              path: deleteControl.path,
              workspace: deleteControl.workspace,
              versionNumber,
              labels: deleteControl.labels,
            }}
          />
        )}
      </div>
      {changeLogHtml && (
        <div className={styles.changelog} dangerouslySetInnerHTML={{ __html: changeLogHtml }} />
      )}
      {validation !== undefined && validationLabels && (
        <ValidationSummary validation={validation} labels={validationLabels} />
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
      {(requiresJahia || released || tag || changelogUrl) && (
        <footer className={styles.versionFooter}>
          {requiresJahia && (
            <span>
              <strong>{requiresJahiaLabel}</strong> {requiresJahia}
            </span>
          )}
          {released && (
            <span>
              <strong>{releasedLabel}</strong> {released}
            </span>
          )}
          {tag && (
            <span data-version-tag="">
              <strong>{tagLabel}</strong>{" "}
              {tag.url ? (
                <a href={tag.url} rel="noopener">
                  {tag.name}
                </a>
              ) : (
                tag.name
              )}
            </span>
          )}
          {changelogUrl && (
            <span>
              <a href={changelogUrl} rel="noopener" data-version-changelog="">
                {changelogLabel}
              </a>
            </span>
          )}
        </footer>
      )}
    </div>
  );
}
