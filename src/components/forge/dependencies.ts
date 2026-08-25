import { buildNodeUrl, getNodesByJCRQuery } from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import { bool, sql, str, strValues } from "./nodeProps";

export interface DependencyLink {
  id: string;
  name: string;
  title: string;
  url: string;
}

/**
 * Titles appearing more than once in one column. `jcr:title` is free text and not unique (only the
 * node name is), so colliding rows would otherwise render identical link text pointing at different
 * modules - WCAG 2.2 SC 2.4.9. The view appends the module id to just these rows.
 */
export function duplicateTitles(links: DependencyLink[]): Set<string> {
  const counts = new Map<string, number>();
  for (const link of links) counts.set(link.title, (counts.get(link.title) ?? 0) + 1);
  const duplicates = new Set<string>();
  for (const [title, count] of counts) if (count > 1) duplicates.add(title);
  return duplicates;
}

/** Bound the declared-reference list read off one version node. */
const REF_CAP = 40;
/** Bound the forward query (a name can match in more than one folder of the site). */
const RESOLVE_SCAN_CAP = 200;
/** Bound the catalogue-wide reverse scan over published version nodes. */
const DEPENDANT_SCAN_CAP = 2000;
/**
 * Bound the rendered reverse list. Neither query carries an ORDER BY, so this truncates in engine
 * scan order and `links.sort()` only orders the survivors: past 40 dependants, WHICH 40 appear is
 * unspecified. Ordering the query would sort by the version's title, not the module's.
 */
const DEPENDANT_CAP = 40;
/**
 * `references` values come from an author-written MANIFEST / package.json, so anything outside this
 * allow-list is DROPPED rather than escaped - an unbalanced quote would throw InvalidQueryException
 * and 500 the page.
 */
const SAFE_REF_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
/** Legacy sentinel for "declares no dependencies". */
const EMPTY_REFERENCES = "none";

/**
 * Escape for a LIKE pattern: `_` and `%` are wildcards, and `_` is also a legal module-name
 * character. The backslash must be escaped FIRST - escaping the wildcards first would let the
 * backslash pass double the escapes we just inserted, making the wildcard live again.
 */
const likeSafe = (v: string): string =>
  sql(v).replaceAll("\\", "\\\\").replaceAll("_", "\\_").replaceAll("%", "\\%");

const moduleTitle = (n: JCRNodeWrapper): string => str(n, "jcr:title") || n.getName();

const toLink = (n: JCRNodeWrapper): DependencyLink => ({
  id: n.getIdentifier(),
  name: n.getName(),
  title: moduleTitle(n),
  url: buildNodeUrl(n),
});

/**
 * The module names a version declares, lowercased and de-duplicated.
 *
 * `CreateEntryFromJar` stores raw manifest tokens, splitting `Jahia-Depends` on "," WITHOUT
 * trimming: `default, seo=[1.1,2)` arrives as `["default"," seo=[1.1","2)"]`. Hence the trim, the
 * split on "=", and the allow-list dropping orphan fragments like `2)`.
 */
export function dependencyRefNames(
  version: JCRNodeWrapper | undefined,
  selfName: string,
): string[] {
  if (!version) return [];
  const raw = strValues(version, "references");
  const self = selfName.toLowerCase();
  const names: string[] = [];
  const seen = new Set<string>();
  for (const value of raw) {
    const name = value.split("=")[0].trim().toLowerCase();
    if (!name || name === EMPTY_REFERENCES || name === self) continue;
    if (!SAFE_REF_NAME.test(name) || seen.has(name)) continue;
    seen.add(name);
    names.push(name);
    if (names.length >= REF_CAP) break;
  }
  return names;
}

/**
 * Resolve names to published store modules in the same site - one query, or none when `names` is
 * empty. Names resolving to nothing (platform modules such as `default`) are silently skipped, as
 * the legacy view skipped them.
 */
export function resolveStoreModules(node: JCRNodeWrapper, names: string[]): DependencyLink[] {
  if (names.length === 0) return [];
  // Lowercased up front so a caller passing mixed case (not just this module's own
  // already-lowercased `dependencyRefNames`) still matches: `wanted` and the query patterns must
  // agree on case, or a name like "SEO" would query for "SEO" and never match the "seo" it read back.
  const lowerNames = names.map((n) => n.toLowerCase());
  const wanted = new Set(lowerNames);
  const sitePath = node.getResolveSite().getPath();
  // LOWER(...) LIKE, not `=`: Jackrabbit's equality branch ignores the LOWER() transform and
  // compares the raw local name, so `= 'SEO'` never matches a node named `seo` - and these names
  // come from a hand-written manifest. The patterns hold no wildcards, so each is an exact lookup.
  const nameOr = lowerNames.map((n) => `LOWER(LOCALNAME(m)) LIKE '${likeSafe(n)}'`).join(" OR ");
  // Site-scoped rather than modules-repository-scoped: the E2E suite creates modules directly under
  // /sites/<key>/contents, outside that folder, and legacy scoped to the site too.
  const query = `SELECT * FROM [jnt:forgeModule] AS m WHERE ISDESCENDANTNODE(m, '${sql(sitePath)}') AND m.[published] = true AND (${nameOr})`;
  const self = node.getIdentifier();
  const links: DependencyLink[] = [];
  const seen = new Set<string>();
  for (const module of getNodesByJCRQuery(node.getSession(), query, RESOLVE_SCAN_CAP)) {
    try {
      const name = module.getName().toLowerCase();
      // Re-checked here so a LIKE over-match can never link the WRONG module: escaping then only
      // has to keep the query well-formed, not guarantee correctness.
      if (!wanted.has(name) || seen.has(name)) continue;
      if (module.getIdentifier() === self) continue;
      // `published` re-checked here too, not just trusted from the query clause - the same
      // app-side backstop forgeDependants already applies to its own query's `published` clause.
      if (!bool(module, "published") || bool(module, "deleted")) continue;
      seen.add(name);
      links.push(toLink(module));
    } catch {
      // Unreadable node - skipped, as legacy skipped unresolvable references.
    }
  }
  // Reproduces the legacy ORDER BY [jcr:title] ASC.
  links.sort((a, b) => a.title.localeCompare(b.title));
  return links;
}

export function forgeDependencies(
  node: JCRNodeWrapper,
  latestVersion: JCRNodeWrapper | undefined,
): DependencyLink[] {
  return resolveStoreModules(node, dependencyRefNames(latestVersion, node.getName()));
}

/**
 * Modules that need this one. No JCR-SQL2 join - Jahia's joins are slow, so this uses the
 * version-scan + parent-walk shape `latestReleaseDates` already uses.
 */
export function forgeDependants(node: JCRNodeWrapper): DependencyLink[] {
  const name = node.getName();
  if (!SAFE_REF_NAME.test(name)) return [];
  const sitePath = node.getResolveSite().getPath();
  const wanted = name.toLowerCase();
  // VERIFIED against the live Jackrabbit backend by a direct probe: LOWER() IS applied per-value on
  // this multi-valued property, even to a value that isn't the array's first entry. An earlier E2E
  // run seemed to show LOWER() being ignored here, but that run was against a stale .tgz (a same-
  // version install silently no-ops) - not a real backend limitation. LIKE, not `=`, because
  // Jackrabbit's `=` branch ignores the LOWER() transform, the same quirk already documented in
  // resolveStoreModules. The trailing `%` deliberately over-matches (e.g. `seo-tools` for `seo`, or
  // a version-ranged spelling like `seo=[1.1,2)`) - the app-side re-check below is what makes the
  // result exact.
  const term = likeSafe(wanted);
  const refOr = [`LOWER(v.[references]) LIKE '${term}%'`, `LOWER(v.[references]) LIKE ' ${term}%'`].join(
    " OR ",
  );
  const query = `SELECT * FROM [jnt:forgeModuleVersion] AS v WHERE ISDESCENDANTNODE(v, '${sql(sitePath)}') AND v.[published] = true AND (${refOr})`;
  const self = node.getIdentifier();
  const links: DependencyLink[] = [];
  const seen = new Set<string>();
  for (const version of getNodesByJCRQuery(node.getSession(), query, DEPENDANT_SCAN_CAP)) {
    if (links.length >= DEPENDANT_CAP) break;
    try {
      // Re-checked on the already-loaded values, so a LIKE over-match is impossible.
      const declares = strValues(version, "references").some(
        (v) => v.split("=")[0].trim().toLowerCase() === wanted,
      );
      if (!declares) continue;
      const module = version.getParent() as unknown as JCRNodeWrapper;
      const id = module.getIdentifier();
      if (id === self || seen.has(id)) continue;
      if (!bool(module, "published") || bool(module, "deleted")) continue;
      seen.add(id);
      links.push(toLink(module));
    } catch {
      // Dangling / unreadable parent - skipped, as latestReleaseDates does.
    }
  }
  links.sort((a, b) => a.title.localeCompare(b.title));
  return links;
}

/**
 * Both directions for one detail page: two queries at most, and none for a package -
 * `jnt:forgePackageVersion` declares no `references`, and this view is shared with package pages.
 */
export function forgeDependencyGraph(
  node: JCRNodeWrapper,
  latestVersion: JCRNodeWrapper | undefined,
): { dependencies: DependencyLink[]; dependants: DependencyLink[] } {
  if (!node.isNodeType("jnt:forgeModule")) return { dependencies: [], dependants: [] };
  try {
    return {
      dependencies: forgeDependencies(node, latestVersion),
      dependants: forgeDependants(node),
    };
  } catch {
    // Both queries call node.getResolveSite().getPath() unguarded; a module whose site can't be
    // resolved would otherwise 500 the whole anonymous detail page. Skipped instead, same as this
    // file's per-row "skip on dangling reference" handling.
    return { dependencies: [], dependants: [] };
  }
}
