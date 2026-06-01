import { buildNodeUrl, getChildNodes } from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";

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
