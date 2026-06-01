import type { JCRNodeWrapper } from "org.jahia.services.content";

/** Read a string property (locale-aware via the render session), or "". */
export function str(node: JCRNodeWrapper, name: string): string {
  return node.hasProperty(name) ? node.getProperty(name).getString() : "";
}

/** Read a boolean property, or false. */
export function bool(node: JCRNodeWrapper, name: string): boolean {
  return node.hasProperty(name) && node.getProperty(name).getBoolean();
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
