import { Island, Render } from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import { useTranslation } from "react-i18next";
import styles from "./detail.module.css";
import FileUploadForm from "~/components/FileUpload/FileUpload.client";

interface DetailVersionsDialogProps {
  versions: JCRNodeWrapper[];
  /** The createEntryFromJar action URL for the owner upload form, or null for non-owners. */
  uploadActionUrl: string | null;
  /** Where the upload form returns to after a successful post (the module page). */
  backUrl: string;
}

/**
 * Versions popup, opened by the header "Versions" button (VersionsDialog island). A native
 * `<dialog>` gives a focus trap, Escape-to-close and an inert backdrop for free; its content
 * (Jahia version views + the owner-only upload-new-version form) is server-rendered.
 */
export function DetailVersionsDialog({
  versions,
  uploadActionUrl,
  backUrl,
}: Readonly<DetailVersionsDialogProps>): JSX.Element {
  const { t } = useTranslation();

  // Labels for the owner-only "upload a new version" form. Posts to the same
  // createEntryFromJar action as the my-modules upload — the action upserts (matches
  // the module by groupId+name in the package) and appends the version.
  const ADD_VERSION_LABELS = {
    fileLabel: t("addVersion.fileLabel"),
    submit: t("addVersion.submit"),
    submitting: t("addVersion.submitting"),
    pickFile: t("addVersion.pickFile"),
    error: t("addVersion.error"),
  };

  return (
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
        {uploadActionUrl && (
          <section className={styles.addVersion} data-add-version="">
            <h3 className={styles.addVersionTitle}>{t("detail.versions.uploadTitle")}</h3>
            <Island
              component={FileUploadForm}
              props={{
                actionUrl: uploadActionUrl,
                backUrl,
                accept: ".jar,.tgz",
                labels: ADD_VERSION_LABELS,
                compact: true,
              }}
            />
          </section>
        )}
        {versions.length === 0 ? (
          <p className={styles.muted}>{t("detail.versions.none")}</p>
        ) : (
          <div className={styles.versions}>
            {versions.map((v) => (
              <Render key={v.getIdentifier()} node={v} view="default" readOnly />
            ))}
          </div>
        )}
      </div>
    </dialog>
  );
}
