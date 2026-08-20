import { useTranslation } from "react-i18next";
import clsx from "clsx";
import styles from "./detail.module.css";
import depStyles from "./dependencies.module.css";
import { duplicateTitles, type DependencyLink } from "./dependencies";

interface DependencyColumnProps {
  column: string;
  title: string;
  links: DependencyLink[];
  empty: string;
}

/**
 * One column: a heading plus either the module links or the empty line carrying the legacy "NONE"
 * semantics. An unnamed <section> is not a landmark, so this is the shape the Video / Screenshots /
 * FAQ sections already use under the passing AAA audit.
 */
function DependencyColumn({
  column,
  title,
  links,
  empty,
}: Readonly<DependencyColumnProps>): JSX.Element {
  // Derived from `column`, not an index, so the id is stable under SSR.
  const headingId = `dependency-${column}-heading`;
  const ambiguous = duplicateTitles(links);
  return (
    <section className={styles.section} data-dependency-column={column}>
      <h2 id={headingId} className={styles.sectionTitle}>
        {title}
      </h2>
      {links.length > 0 ? (
        <ul className={depStyles.list} aria-labelledby={headingId}>
          {links.map((link) => (
            <li key={link.name} className={depStyles.item}>
              <a className={depStyles.link} href={link.url} data-dependency={link.name}>
                {link.title}
                {ambiguous.has(link.title) && <span className="sr-only"> ({link.name})</span>}
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p className={clsx(styles.muted, depStyles.empty)}>{empty}</p>
      )}
    </section>
  );
}

interface DependencyListsProps {
  dependencies: DependencyLink[];
  dependants: DependencyLink[];
}

/**
 * "Dependencies" / "Depended on by" for a module: what it needs, and what needs it. Restores the
 * section the pre-5.0 detail page carried (MOD-1705), dropped by the JS-module cutover. Each row
 * links to the module's own page, whose download CTA is then one click away.
 */
export function DependencyLists({
  dependencies,
  dependants,
}: Readonly<DependencyListsProps>): JSX.Element {
  const { t } = useTranslation();
  return (
    <div className={depStyles.columns} data-dependency-lists="">
      <DependencyColumn
        column="dependencies"
        title={t("detail.dependencies.dependencies")}
        links={dependencies}
        empty={t("detail.dependencies.noneDependencies")}
      />
      <DependencyColumn
        column="dependants"
        title={t("detail.dependencies.dependants")}
        links={dependants}
        empty={t("detail.dependencies.noneDependants")}
      />
    </div>
  );
}
