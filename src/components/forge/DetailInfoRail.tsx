import { useTranslation } from "react-i18next";
import styles from "./detail.module.css";

/** Only http(s) URLs are safe to render as a link href (blocks stored javascript:/data: URLs). */
function isHttpUrl(url: string): boolean {
  return /^https?:\/\//i.test(url.trim());
}

interface DetailInfoRailProps {
  moduleId: string;
  groupId: string;
  status: string;
  categoryNames: string[];
  author: string;
  authorURL: string;
  requiresJahia: string;
  updated: string;
  codeRepository: string;
  tags: string[];
}

/**
 * The persistent "Information" rail on the module detail page — always visible (not
 * behind a tab), as in the legacy UI. A `<div>`, not `<aside>`: a complementary
 * landmark nested in `<main>` trips the axe AAA gate. DOM order is main-first
 * (reading order); CSS grid places this rail on the left.
 */
export function DetailInfoRail({
  moduleId,
  groupId,
  status,
  categoryNames,
  author,
  authorURL,
  requiresJahia,
  updated,
  codeRepository,
  tags,
}: Readonly<DetailInfoRailProps>): JSX.Element {
  const { t } = useTranslation();
  return (
    <div className={styles.sidebar} data-detail-info="">
      <h2 className={styles.sidebarTitle}>{t("detail.tabs.information")}</h2>
      <dl className={styles.meta}>
        <dt>{t("detail.meta.moduleId")}</dt>
        <dd>{moduleId}</dd>
        {groupId && (
          <>
            <dt>{t("detail.meta.groupId")}</dt>
            <dd>{groupId}</dd>
          </>
        )}
        {status && (
          <>
            <dt>{t("detail.meta.status")}</dt>
            <dd className={styles.metaStatus}>{status}</dd>
          </>
        )}
        {categoryNames.length > 0 && (
          <>
            <dt>{t("detail.meta.category")}</dt>
            <dd>{categoryNames.join(", ")}</dd>
          </>
        )}
        {author && (
          <>
            <dt>{t("detail.meta.author")}</dt>
            <dd>{author}</dd>
          </>
        )}
        {isHttpUrl(authorURL) && (
          <>
            <dt>{t("detail.meta.developerWebsite")}</dt>
            <dd>
              <a href={authorURL} rel="noopener noreferrer nofollow" target="_blank">
                {authorURL}
              </a>
            </dd>
          </>
        )}
        {requiresJahia && (
          <>
            <dt>{t("detail.meta.requiresJahia")}</dt>
            <dd>{requiresJahia}</dd>
          </>
        )}
        {updated && (
          <>
            <dt>{t("detail.meta.updated")}</dt>
            <dd>{updated}</dd>
          </>
        )}
        {codeRepository && (
          <>
            <dt>{t("detail.meta.source")}</dt>
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
            <dt>{t("detail.meta.tags")}</dt>
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
  );
}
