import { buildNodeUrl, getChildNodes, getNodesByJCRQuery } from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper, JCRSessionWrapper } from "org.jahia.services.content";

function parseVersion(v: string): number[] {
  return (v || "").split(/\D+/).filter(Boolean).map(Number);
}

/** Descending comparator on dotted version numbers (1.10 > 1.9 > 1.0). */
export function compareVersionsDesc(a: string, b: string): number {
  const pa = parseVersion(a);
  const pb = parseVersion(b);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const d = (pb[i] || 0) - (pa[i] || 0);
    if (d !== 0) return d;
  }
  return b.localeCompare(a);
}

/**
 * Download URL for a version. If a jnt:file is attached (JS modules / packages),
 * link to that genuine artifact. Otherwise (JAR modules deployed to the site's
 * Maven repo) build the MavenProxy URL from the module coordinates instead of a
 * stored absolute URL - a root-relative `/modules/mavenproxy/…` so the browser
 * resolves it against whatever scheme/host/port the storefront is served on.
 * Mirrors the catalog moduleList.jsp generation.
 */
export function versionDownloadUrl(version: JCRNodeWrapper): string | null {
  const files = getChildNodes(version, 1, 0, (n) => n.isNodeType("jnt:file"));
  if (files.length > 0) return buildNodeUrl(files[0]);
  const module = version.getParent() as unknown as JCRNodeWrapper;
  if (!module) return null;
  const groupId = module.hasProperty("groupId") ? module.getProperty("groupId").getString() : "";
  const versionNumber = version.hasProperty("versionNumber")
    ? version.getProperty("versionNumber").getString()
    : version.getName();
  if (!groupId || !versionNumber) return null;
  const site = module.getResolveSite().getSiteKey();
  const name = module.getName();
  const groupPath = groupId.replaceAll(".", "/");
  return `/modules/mavenproxy/${site}/${groupPath}/${name}/${versionNumber}/${name}-${versionNumber}.jar`;
}

/**
 * Displayable Jahia version a module/package version requires (the `requiredVersion`
 * weakreference), without the "version-" node-name prefix, or "" when unset/dangling.
 */
export function requiredJahiaVersion(version: JCRNodeWrapper | undefined): string {
  if (!version) return "";
  try {
    if (version.hasProperty("requiredVersion")) {
      const ref = version.getProperty("requiredVersion").getNode() as unknown as JCRNodeWrapper;
      // The required-version nodes are named "version-8.1.6.2"; show just "8.1.6.2".
      return ref ? ref.getDisplayableName().replace(/^version-/, "") : "";
    }
  } catch {
    // Dangling reference.
  }
  return "";
}

/** ISO date string of a node's creation (queryable mix:created property), or "". */
function createdIso(node: JCRNodeWrapper): string {
  return node.hasProperty("jcr:created") ? node.getProperty("jcr:created").getString() : "";
}

/** The published parent module/package of a version node, or null when unpublished/unreadable. */
function publishedParent(version: JCRNodeWrapper): JCRNodeWrapper | null {
  try {
    const parent = version.getParent() as unknown as JCRNodeWrapper;
    const isPublished =
      parent && parent.hasProperty("published") && parent.getProperty("published").getBoolean();
    return isPublished ? parent : null;
  } catch {
    return null;
  }
}

/**
 * The most recently released modules/packages across the catalogue under `basePath`,
 * newest first. Powers the home "Latest releases" panel: it queries the published
 * version nodes of both types, sorts them by creation date (ISO strings sort
 * chronologically) and keeps only the newest published version PER owning module — so a
 * module that cut several releases appears once. Returns those representative version
 * nodes (the caller derives the module + its latest version/date from each).
 */
export function latestModuleReleases(
  session: JCRSessionWrapper,
  basePath: string,
  limit: number,
): JCRNodeWrapper[] {
  const escaped = basePath.replaceAll("'", "''");
  const fetch = (type: string): JCRNodeWrapper[] =>
    getNodesByJCRQuery(
      session,
      `SELECT * FROM [${type}] AS v WHERE ISDESCENDANTNODE(v, '${escaped}') ` +
        `AND v.[published] = true ORDER BY v.[jcr:created] DESC`,
      // Over-fetch: hits get filtered (unpublished module) and collapsed (one per module).
      limit * 8,
    );
  const newestFirst = [
    ...fetch("jnt:forgeModuleVersion"),
    ...fetch("jnt:forgePackageVersion"),
  ].sort((a, b) => createdIso(b).localeCompare(createdIso(a)));
  // Group per module: keep each module's newest published version, once, up to `limit`.
  const seenModules = new Set<string>();
  const releases: JCRNodeWrapper[] = [];
  for (const version of newestFirst) {
    const module = publishedParent(version);
    if (!module) continue;
    const moduleId = module.getIdentifier();
    if (seenModules.has(moduleId)) continue;
    seenModules.add(moduleId);
    releases.push(version);
    if (releases.length >= limit) break;
  }
  return releases;
}

/** Version child nodes of a module/package, sorted newest-first (replaces ForgeFunctions.sortByVersion). */
export function sortedVersionNodes(node: JCRNodeWrapper): JCRNodeWrapper[] {
  const versions = getChildNodes(
    node,
    200,
    0,
    (n) => n.isNodeType("jnt:forgeModuleVersion") || n.isNodeType("jnt:forgePackageVersion"),
  );
  const versionNumber = (v: JCRNodeWrapper) =>
    v.hasProperty("versionNumber") ? v.getProperty("versionNumber").getString() : v.getName();
  return versions.sort((a, b) => compareVersionsDesc(versionNumber(a), versionNumber(b)));
}
