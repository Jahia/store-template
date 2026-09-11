import { buildNodeUrl, getNodesByJCRQuery } from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import { bool, sql, str, strValues } from "./nodeProps";

export interface DependencyLink {
  id: string;
  name: string;
  title: string;
  url: string;
  groupId: string;
}

/**
 * Titles appearing more than once in one column. `jcr:title` is free text and not unique (only the
 * node name is), so colliding rows would otherwise render identical link text pointing at different
 * modules - WCAG 2.2 SC 2.4.9. `disambiguators` below uses this to find the rows that need a
 * further label.
 */
export function duplicateTitles(links: DependencyLink[]): Set<string> {
  const counts = new Map<string, number>();
  for (const link of links) counts.set(link.title, (counts.get(link.title) ?? 0) + 1);
  const duplicates = new Set<string>();
  for (const [title, count] of counts) if (count > 1) duplicates.add(title);
  return duplicates;
}

/**
 * Joins a tier-3/4 disambiguator's parts. A non-word separator, so the rendered label needs no
 * translation - an English word (e.g. "id") would render untranslated on a non-English storefront.
 */
const DISAMBIGUATOR_SEPARATOR = " - ";

/**
 * Visible disambiguator for each row that needs one, keyed by `link.id`. A row whose title is
 * unique in its column has no entry at all - the caller renders its title alone. Tiered so the
 * label stays meaningful rather than opaque:
 *
 * 1. Title unique in the column -> no entry.
 * 2. Title collides -> `link.name` (the JCR node name, unique within one folder).
 * 3. Title AND name both still collide -> name plus `link.groupId`, since two modules can share
 *    both a title and a node name only by living in different groupId folders.
 * 4. Title, name AND groupId all still collide, or groupId is empty -> a short prefix of
 *    `link.id`.
 *
 * Tiers 3 and 4 draw from different value spaces, so a row's groupId can coincidentally equal
 * another row's id prefix; a final pass therefore re-checks the labels actually produced and
 * demotes any that still collide to tier 4. What survives that is the one residual case: two rows
 * sharing a title and a name whose identifiers also share their first 8 characters. Not resolved
 * here, and not reachable from JCR identifiers in practice.
 */
/**
 * NUL separator: it cannot occur in a JCR node name or a free-text `jcr:title`, whereas a
 * printable one would make the tuple ambiguous - title "A B" + name "c" would key the same as
 * title "A" + name "B c", escalating rows to a tier they do not need. Never rendered.
 */
const nameKey = (link: DependencyLink): string => `${link.title}\u0000${link.name}`;

const groupKey = (link: DependencyLink): string =>
  `${link.title}\u0000${link.name}\u0000${link.groupId}`;

/** How many of `links` share each key, counting only the rows `include` accepts. */
function countByKey(
  links: DependencyLink[],
  key: (link: DependencyLink) => string,
  include: (link: DependencyLink) => boolean,
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const link of links) {
    if (!include(link)) continue;
    const k = key(link);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return counts;
}

/** Tier-4 label: the name plus a short id prefix - the one value that always varies per node. */
const idLabel = (link: DependencyLink): string =>
  `${link.name}${DISAMBIGUATOR_SEPARATOR}${link.id.slice(0, 8)}`;

export function disambiguators(links: DependencyLink[]): Map<string, string> {
  const result = new Map<string, string>();
  const duplicateTitleSet = duplicateTitles(links);
  if (duplicateTitleSet.size === 0) return result;

  const titleCollides = (link: DependencyLink): boolean => duplicateTitleSet.has(link.title);
  const nameKeyCounts = countByKey(links, nameKey, titleCollides);
  const nameCollides = (link: DependencyLink): boolean =>
    (nameKeyCounts.get(nameKey(link)) ?? 0) > 1;
  const groupKeyCounts = countByKey(
    links,
    groupKey,
    (link) => titleCollides(link) && nameCollides(link),
  );

  // Tier 2 (name), tier 3 (name + groupId) or tier 4 (name + id prefix), in that order of
  // preference - the first one that actually tells two same-titled rows apart.
  for (const link of links) {
    if (!titleCollides(link)) continue;
    if (!nameCollides(link)) {
      result.set(link.id, link.name);
    } else if (link.groupId === "" || (groupKeyCounts.get(groupKey(link)) ?? 0) > 1) {
      result.set(link.id, idLabel(link));
    } else {
      result.set(link.id, `${link.name}${DISAMBIGUATOR_SEPARATOR}${link.groupId}`);
    }
  }

  // The tiers above each check for collisions only within their own value space, so a tier-3 label
  // (name + groupId) and a tier-4 one (name + id prefix) can still coincide. Re-check the rendered
  // label - what the reader actually sees is the title plus this label - and demote any row that
  // is still ambiguous to tier 4, which at least varies per node.
  const labelled = links.filter((link) => result.has(link.id));
  const labelKey = (link: DependencyLink): string => `${link.title}\u0000${result.get(link.id)}`;
  const labelCounts = countByKey(labelled, labelKey, () => true);
  for (const link of labelled) {
    if ((labelCounts.get(labelKey(link)) ?? 0) > 1) result.set(link.id, idLabel(link));
  }
  return result;
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
// The backslash pair stays written as escapes: String.raw cannot express a lone trailing
// backslash (it would escape the closing backtick), so only the wildcard replacements below
// use it (typescript:S7780).
const likeSafe = (v: string): string =>
  sql(v)
    .replaceAll("\\", "\\\\")
    .replaceAll("_", String.raw`\_`)
    .replaceAll("%", String.raw`\%`);

const moduleTitle = (n: JCRNodeWrapper): string => str(n, "jcr:title") || n.getName();

const toLink = (n: JCRNodeWrapper): DependencyLink => ({
  id: n.getIdentifier(),
  name: n.getName(),
  title: moduleTitle(n),
  url: buildNodeUrl(n),
  groupId: str(n, "groupId"),
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
 *
 * Exported (not just used by `forgeDependencies`) for a possible future package view ("Embedded
 * Modules") that would resolve names the same way - no such consumer exists in this repo yet.
 * Unlike `forgeDependants`, this does not apply SAFE_REF_NAME to `names` - escaping the LIKE
 * pattern alone keeps the query well-formed, and the app-side `wanted` re-check below keeps the
 * result correct even so.
 *
 * `sitePath` must be the resolved site path of `node`; `forgeDependencyGraph` is what guarantees
 * that today.
 */
export function resolveStoreModules(
  node: JCRNodeWrapper,
  names: string[],
  sitePath: string,
): DependencyLink[] {
  if (names.length === 0) return [];
  // Lowercased up front so a caller passing mixed case (not just this module's own
  // already-lowercased `dependencyRefNames`) still matches: `wanted` and the query patterns must
  // agree on case, or a name like "SEO" would query for "SEO" and never match the "seo" it read
  // back.
  const lowerNames = names.map((n) => n.toLowerCase());
  const wanted = new Set(lowerNames);
  // LOWER(...) LIKE, not `=`: Jackrabbit's equality branch ignores the LOWER() transform and
  // compares the raw local name, so `= 'SEO'` never matches a node named `seo` - and these names
  // come from a hand-written manifest. The patterns hold no wildcards, so each is an exact lookup.
  const nameOr = lowerNames.map((n) => `LOWER(LOCALNAME(m)) LIKE '${likeSafe(n)}'`).join(" OR ");
  // Site-scoped rather than modules-repository-scoped: the E2E suite creates modules directly under
  // /sites/<key>/contents, outside that folder, and legacy scoped to the site too.
  const query =
    `SELECT * FROM [jnt:forgeModule] AS m WHERE ISDESCENDANTNODE(m, '${sql(sitePath)}') ` +
    `AND m.[published] = true AND (${nameOr})`;
  const self = node.getIdentifier();
  const links: DependencyLink[] = [];
  // De-duped by NAME (not identifier, unlike forgeDependants below): a short name is not unique
  // across a site's folders, so two published `seo` nodes in different folders could collapse to
  // an arbitrary one (no ORDER BY here). Deliberate - a declared reference names a module, so one
  // row per referenced name is the intended rendering.
  const seen = new Set<string>();
  for (const module of getNodesByJCRQuery(node.getSession(), query, RESOLVE_SCAN_CAP)) {
    try {
      const name = module.getName().toLowerCase();
      // Re-checked here so a LIKE over-match can never link the WRONG module: escaping then only
      // has to keep the query well-formed, not guarantee correctness.
      if (!wanted.has(name) || seen.has(name)) continue;
      if (module.getIdentifier() === self) continue;
      // `deleted` is a real declared property, not dead code: both jnt:forgeModule and
      // jnt:forgePackage declare `- deleted (boolean) = false autocreated hidden` in
      // privateappstore's META-INF/definitions.cnd (lines 63 and 83). `published` is re-checked
      // here too, not just trusted from the query clause - the same app-side backstop
      // forgeDependants already applies to its own query's `published` clause.
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

/**
 * `sitePath` must be the resolved site path of `node`; `forgeDependencyGraph` is what guarantees
 * that today.
 */
export function forgeDependencies(
  node: JCRNodeWrapper,
  latestVersion: JCRNodeWrapper | undefined,
  sitePath: string,
): DependencyLink[] {
  return resolveStoreModules(node, dependencyRefNames(latestVersion, node.getName()), sitePath);
}

/**
 * Modules that need this one. No JCR-SQL2 join - Jahia's joins are slow, so this uses the
 * version-scan + parent-walk shape `latestReleaseDates` already uses.
 *
 * `sitePath` must be the resolved site path of `node`; `forgeDependencyGraph` is what guarantees
 * that today.
 */
export function forgeDependants(node: JCRNodeWrapper, sitePath: string): DependencyLink[] {
  const name = node.getName();
  if (!SAFE_REF_NAME.test(name)) return [];
  const wanted = name.toLowerCase();
  // VERIFIED against the live Jackrabbit backend by a direct probe: LOWER() IS applied per-value on
  // this multi-valued property, even to a value that isn't the array's first entry. An earlier E2E
  // run seemed to show LOWER() being ignored here, but that run was against a stale .tgz (a same-
  // version install silently no-ops) - not a real backend limitation. LIKE, not `=`, because
  // Jackrabbit's `=` branch ignores the LOWER() transform, the same quirk already documented in
  // resolveStoreModules. Anchored (no bare trailing `%`): an unbounded prefix let a module whose
  // name is a prefix of others (e.g. `seo` matching `seo-tools`, `seo-sitemap`, ...) pull back rows
  // that only consume DEPENDANT_SCAN_CAP - a hard result limit, not a hint - before the app-side
  // re-check below discards them. The three suffix forms per leading-space prefix cover an exact
  // reference, a version-ranged one (`seo=[1.1,2)`), and one followed by other whitespace; the
  // app-side re-check below is still what makes the result exact.
  //
  // Asymmetric with the forward direction: dependencyRefNames() normalises with .trim(), which
  // handles ANY leading/trailing whitespace, but this query can only enumerate the two whitespace
  // spellings below. A manifest written "Jahia-Depends: default,  seo" (two spaces, or a tab)
  // stores "  seo": the forward direction resolves it, but this query never returns that row, so
  // the app-side re-check can't rescue it and that dependant goes permanently and silently missing.
  // The real fix is normalising on ingest in jahia-store's CreateEntryFromJar, which splits
  // Jahia-Depends on "," without trimming.
  const term = likeSafe(wanted);
  const prefixes = ["", " "];
  const suffixes = ["", "=%", " %"];
  const refOr = prefixes
    .flatMap((prefix) =>
      suffixes.map((suffix) => `LOWER(v.[references]) LIKE '${prefix}${term}${suffix}'`),
    )
    .join(" OR ");
  const query =
    `SELECT * FROM [jnt:forgeModuleVersion] AS v WHERE ISDESCENDANTNODE(v, '${sql(sitePath)}') ` +
    `AND v.[published] = true AND (${refOr})`;
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
      // `deleted` - see resolveStoreModules above: declared on both content types, not dead code.
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
  let sitePath: string;
  try {
    sitePath = node.getResolveSite().getPath();
  } catch {
    // The ONLY failure this catch guards: node.getResolveSite() itself throwing for a module whose
    // site can't be resolved. Skipped instead, same as this file's per-row "skip on dangling
    // reference" handling, so that case alone can't 500 the anonymous detail page. A malformed
    // query (e.g. an unescaped interpolation throwing InvalidQueryException) is deliberately NOT
    // swallowed any more - it now propagates so a real bug surfaces instead of silently vanishing
    // this whole section.
    return { dependencies: [], dependants: [] };
  }
  return {
    dependencies: forgeDependencies(node, latestVersion, sitePath),
    dependants: forgeDependants(node, sitePath),
  };
}
