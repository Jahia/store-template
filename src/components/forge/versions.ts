import { buildNodeUrl, getChildNodes, getNodesByJCRQuery } from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper, JCRSessionWrapper } from "org.jahia.services.content";
import { bool, releaseStamp, sql } from "./nodeProps";

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
 * One path segment of a MavenProxy URL: Maven-coordinate charset only, and never a bare
 * "." / ".." that the browser would normalize into a traversal out of /modules/mavenproxy/.
 * groupId/versionNumber are author-supplied module properties, so they can't be trusted.
 */
const SAFE_MAVEN_SEGMENT = /^(?!\.{1,2}$)[A-Za-z0-9._-]+$/;

/**
 * Download URL for a version. If a jnt:file is attached (JS modules / packages),
 * link to that genuine artifact. Otherwise (JAR modules deployed to the site's
 * Maven repo) build the MavenProxy URL from the module coordinates instead of a
 * stored absolute URL - a root-relative `/modules/mavenproxy/…` so the browser
 * resolves it against whatever scheme/host/port the storefront is served on.
 * Mirrors the catalog moduleList.jsp generation. Returns null when any
 * coordinate fails validation rather than emitting a traversable href.
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
  const groupSegments = groupId.split(".");
  const segments = [site, ...groupSegments, name, versionNumber];
  if (!segments.every((segment) => SAFE_MAVEN_SEGMENT.test(segment))) return null;
  const groupPath = groupSegments.join("/");
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

/** Bound the catalogue-wide release-date scan so an unbounded version set can never run away. */
const RELEASE_SCAN_CAP = 20000;

/**
 * Map of module/package identifier → ISO last-modified ("release") date of its newest published
 * version, across the catalogue under `basePath`. Powers the storefront list's "newest release
 * first" ordering: a `jmix:forgeElement` has no release date of its own (the date lives on its
 * child version nodes, which JCR-SQL2 can't ORDER BY from the module), so we make ONE pass over the
 * published version nodes of both types — two queries — and reduce to the max date per owning
 * module, rather than an N+1 child lookup per module. ISO date strings sort chronologically as
 * plain strings. The date is the version's `releaseStamp` (the immutable upload date, falling back
 * to jcr:lastModified) - never jcr:created, which is the migration run date for content copied
 * from the legacy store. Modules with no published version are simply absent from the map
 * (callers treat that as "" = oldest).
 */
export function latestReleaseDates(
  session: JCRSessionWrapper,
  basePath: string,
): Map<string, string> {
  const escaped = sql(basePath);
  const dates = new Map<string, string>();
  const scan = (type: string): void => {
    const versions = getNodesByJCRQuery(
      session,
      `SELECT * FROM [${type}] AS v WHERE ISDESCENDANTNODE(v, '${escaped}') AND v.[published] = true`,
      RELEASE_SCAN_CAP,
    );
    for (const version of versions) {
      try {
        const date = releaseStamp(version);
        if (!date) continue;
        const moduleId = (version.getParent() as unknown as JCRNodeWrapper).getIdentifier();
        const current = dates.get(moduleId);
        if (!current || date > current) dates.set(moduleId, date);
      } catch {
        // Unreadable parent / dangling node — skip; that module just sorts as "" (oldest).
      }
    }
  };
  scan("jnt:forgeModuleVersion");
  scan("jnt:forgePackageVersion");
  return dates;
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

/**
 * Release day ("YYYY-MM-DD") of the most recently released PUBLISHED version, or "" when the
 * module has none - the module-level "Released" date in the detail Information rail.
 *
 * Takes the version list the caller already holds (no second child fetch) and ignores drafts,
 * so the rail shows the same date to an owner and to an anonymous visitor. Reduces by MAX
 * release timestamp rather than taking the highest version number: a 4.x patch published after
 * 5.0 is the newest release in time, which is what "Released" means. Mirrors how
 * `latestReleaseDates` ranks modules on the storefront grid, so the two never disagree.
 */
export function latestReleaseDate(versions: JCRNodeWrapper[]): string {
  let latest = "";
  for (const version of versions) {
    if (!bool(version, "published")) continue;
    const stamp = releaseStamp(version);
    if (stamp > latest) latest = stamp;
  }
  return latest.slice(0, 10);
}
