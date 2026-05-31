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
 * Download URL for a version: the attached jnt:file's path if present
 * (the genuine artifact), else the `url` property — mirroring moduleList.jsp.
 */
export function versionDownloadUrl(version: JCRNodeWrapper): string | null {
  const files = getChildNodes(version, 1, 0, (n) => n.isNodeType("jnt:file"));
  if (files.length > 0) return buildNodeUrl(files[0]);
  if (version.hasProperty("url")) {
    const u = version.getProperty("url").getString();
    return u || null;
  }
  return null;
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
