import { buildNodeUrl } from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import { forgeIconUrl } from "./forgeCard";
import { isoDay, str } from "./nodeProps";
import styles from "./forge.module.css";

interface LatestReleasesProps {
  /** One representative version node per module, newest first (from latestModuleReleases). */
  versions: JCRNodeWrapper[];
  /** Section heading (translated server-side). */
  heading: string;
}

/**
 * Home "Latest releases" panel: the most recently released modules, one card per
 * module (its newest published version + release date). Pure presentational — the
 * data is computed and grouped per module by the caller (latestModuleReleases) and
 * the whole card links to the module detail. Renders nothing when there are none.
 */
export function LatestReleases({ versions, heading }: Readonly<LatestReleasesProps>): JSX.Element | null {
  if (versions.length === 0) return null;
  return (
    <section
      className={styles.latest}
      aria-labelledby="latest-releases-heading"
      data-latest-releases=""
    >
      {/* h2: sits under the page <h1>; the grid's card titles are also h2 (sibling sections). */}
      <h2 id="latest-releases-heading" className={styles.latestHeading}>
        {heading}
      </h2>
      <ul className={styles.latestList}>
        {versions.map((version) => {
          const module = version.getParent() as unknown as JCRNodeWrapper;
          const title = str(module, "jcr:title") || module.getName();
          const versionNumber = str(version, "versionNumber") || version.getName();
          // The "updated" date — preserved from migration; jcr:created would be the migration run date.
          const date = isoDay(version, "jcr:lastModified");
          const iconUrl = forgeIconUrl(module);
          return (
            <li key={version.getIdentifier()} className={styles.latestItem}>
              <a className={styles.latestCard} href={buildNodeUrl(module)} data-latest-card="">
                <span className={styles.latestIcon}>
                  {iconUrl ? (
                    <img src={iconUrl} alt="" width="40" height="40" loading="lazy" />
                  ) : (
                    <span aria-hidden="true">{title.charAt(0).toUpperCase()}</span>
                  )}
                </span>
                <span className={styles.latestText}>
                  <span className={styles.latestTitle}>{title}</span>
                  <span className={styles.latestMeta}>
                    <span className={styles.latestVersion}>{versionNumber}</span>
                    {date && <time className={styles.latestDate} dateTime={date}>{date}</time>}
                  </span>
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
