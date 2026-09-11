import type { JCRNodeWrapper } from "org.jahia.services.content";

/** Read a string property (locale-aware via the render session), or "". */
export function str(node: JCRNodeWrapper, name: string): string {
  return node.hasProperty(name) ? node.getProperty(name).getString() : "";
}

/** Read a boolean property, or false. */
export function bool(node: JCRNodeWrapper, name: string): boolean {
  return node.hasProperty(name) && node.getProperty(name).getBoolean();
}

/**
 * Escape a value for a JCR-SQL2 string literal (doubles embedded single quotes). Security-relevant:
 * every value interpolated into a query built by this module must be passed through this first.
 */
export function sql(v: string): string {
  return v.replaceAll("'", "''");
}

/**
 * Raw release timestamp of a version node - the FULL JCR date string, for ordering.
 *
 * Reads `uploadDate`, which jahia-store's createEntryFromJar stamps once when the version node
 * is created and never rewrites, so later edits (changelog, publish toggle, a metadata fix) do
 * NOT move a release date. Falls back to jcr:lastModified for version nodes that predate the
 * property or were created outside the upload action (jContent, GraphQL, provisioning) - that
 * is the value the storefront showed before, so the fallback is a no-op for existing content.
 *
 * Keep the FULL timestamp for comparisons: two versions released on the same day must still
 * order by time of day (the storefront's "newest release first" grid relies on it).
 */
export function releaseStamp(version: JCRNodeWrapper): string {
  return str(version, "uploadDate") || str(version, "jcr:lastModified");
}

/** Release timestamp of a version node as an ISO day "YYYY-MM-DD" for display, or "". */
export function releaseDay(version: JCRNodeWrapper): string {
  return releaseStamp(version).slice(0, 10);
}

/** Read a multi-valued property as a string[] (each value's string form), or []. */
export function strValues(node: JCRNodeWrapper, name: string): string[] {
  if (!node.hasProperty(name)) return [];
  try {
    return node
      .getProperty(name)
      .getValues()
      .map((v) => v.getString());
  } catch {
    return [];
  }
}

/**
 * GraphQL workspace enum ("EDIT" | "LIVE") for the workspace this node was read
 * from. Client islands that mutate the node must target the same workspace -
 * forge content uploaded on the live site is created directly in LIVE.
 */
export function jcrWorkspace(node: JCRNodeWrapper): "EDIT" | "LIVE" {
  return node.getSession().getWorkspace().getName() === "live" ? "LIVE" : "EDIT";
}
