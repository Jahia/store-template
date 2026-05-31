import type { JCRNodeWrapper } from "org.jahia.services.content";

/** Read a string property (locale-aware via the render session), or "". */
export function str(node: JCRNodeWrapper, name: string): string {
  return node.hasProperty(name) ? node.getProperty(name).getString() : "";
}

/** Read a boolean property, or false. */
export function bool(node: JCRNodeWrapper, name: string): boolean {
  return node.hasProperty(name) && node.getProperty(name).getBoolean();
}
