import styles from "./detail.module.css";

export interface VersionCardProps {
  versionNumber: string;
  published: boolean;
  changeLogHtml: string;
  downloadUrl: string | null;
}

/** Presentational card for one module/package version (changelog is sanitized richtext). */
export function VersionCard({ versionNumber, published, changeLogHtml, downloadUrl }: Readonly<VersionCardProps>): JSX.Element {
  return (
    <div className={styles.version}>
      <div className={styles.versionHead}>
        <span className={styles.versionNumber}>{versionNumber}</span>
        {!published && <span className={styles.draft}>draft</span>}
        {downloadUrl && (
          <a className={styles.download} href={downloadUrl}>
            Download
          </a>
        )}
      </div>
      {changeLogHtml && (
        <div className={styles.changelog} dangerouslySetInnerHTML={{ __html: changeLogHtml }} />
      )}
    </div>
  );
}
