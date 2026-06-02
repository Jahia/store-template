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
  /** Developer/author shown on the card foot. */
  author?: string;
  /** Category display names - drives the storefront's category facet filter. */
  categories?: string[];
  /** Translated "Supported" badge label (computed server-side). */
  supportedLabel: string;
  /** Translated "Reviewed" badge label (computed server-side). */
  reviewedLabel: string;
}

/**
 * Presentational card for a forge module/package in a list. Pure props - the
 * jnt:forgeModule / jnt:forgePackage `default` views compute the data and pass
 * it in. `data-categories` (pipe-joined) lets the StoreFilter island filter by
 * the sidebar category facets without re-querying the JCR.
 */
export function ForgeEntryCard({
  title,
  excerpt,
  iconUrl,
  detailUrl,
  status,
  supported,
  reviewed,
  author,
  categories = [],
  supportedLabel,
  reviewedLabel,
}: Readonly<ForgeEntryCardProps>): JSX.Element {
  return (
    <a
      className={styles.card}
      href={detailUrl}
      data-forge-card=""
      data-status={status || ""}
      data-title={title.toLowerCase()}
      data-categories={categories.join("|")}
    >
      <div className={styles.cardIcon}>
        {iconUrl ? (
          <img src={iconUrl} alt="" width="64" height="64" loading="lazy" />
        ) : (
          <span className={styles.iconPlaceholder} aria-hidden="true">
            {title ? title.charAt(0).toUpperCase() : "?"}
          </span>
        )}
      </div>
      <div className={styles.cardBody}>
        {/* h2: card titles sit directly under the page <h1>; h3 would skip a level (axe heading-order). */}
        <h2 className={styles.cardTitle}>{title}</h2>
        {excerpt && <p className={styles.cardExcerpt}>{excerpt}</p>}
        <div className={styles.cardFoot}>
          <div className={styles.badges}>
            {status && (
              <span className={clsx(styles.badge, styles.status)} data-status={status}>
                {status}
              </span>
            )}
            {supported && <span className={clsx(styles.badge, styles.supported)}>{supportedLabel}</span>}
            {reviewed && <span className={clsx(styles.badge, styles.reviewed)}>{reviewedLabel}</span>}
          </div>
          {author && (
            <span className={styles.author}>
              <svg className={styles.authorIcon} viewBox="0 0 16 16" aria-hidden="true" width="14" height="14">
                <path
                  fill="currentColor"
                  d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm0 1.5c-2.7 0-5 1.4-5 3.2V14h10v-1.3c0-1.8-2.3-3.2-5-3.2Z"
                />
              </svg>
              {author}
            </span>
          )}
        </div>
      </div>
    </a>
  );
}
