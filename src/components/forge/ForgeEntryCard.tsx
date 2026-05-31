import clsx from "clsx";
import styles from "./forge.module.css";

export interface ForgeEntryCardProps {
  title: string;
  excerpt: string;
  iconUrl: string | null;
  detailUrl: string;
  status?: string;
  supported?: boolean;
  reviewed?: boolean;
}

/**
 * Presentational card for a forge module/package in a list. Pure props — the
 * jnt:forgeModule / jnt:forgePackage `default` views compute the data and pass
 * it in.
 */
export function ForgeEntryCard({
  title,
  excerpt,
  iconUrl,
  detailUrl,
  status,
  supported,
  reviewed,
}: ForgeEntryCardProps): JSX.Element {
  return (
    <a
      className={styles.card}
      href={detailUrl}
      data-forge-card=""
      data-status={status || ""}
      data-title={title.toLowerCase()}
    >
      <div className={styles.cardIcon}>
        {iconUrl ? (
          <img src={iconUrl} alt="" width="56" height="56" loading="lazy" />
        ) : (
          <span className={styles.iconPlaceholder} aria-hidden="true">
            {title ? title.charAt(0).toUpperCase() : "?"}
          </span>
        )}
      </div>
      <div className={styles.cardBody}>
        <h3 className={styles.cardTitle}>{title}</h3>
        {excerpt && <p className={styles.cardExcerpt}>{excerpt}</p>}
        <div className={styles.badges}>
          {status && (
            <span className={clsx(styles.badge, styles.status)} data-status={status}>
              {status}
            </span>
          )}
          {supported && <span className={clsx(styles.badge, styles.supported)}>Supported</span>}
          {reviewed && <span className={clsx(styles.badge, styles.reviewed)}>Reviewed</span>}
        </div>
      </div>
    </a>
  );
}
