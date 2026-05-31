import { buildNodeUrl, getChildNodes } from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";

/** Strip HTML tags + collapse whitespace from a Jahia richtext value. */
export function stripHtml(html: string): string {
  return (html || "")
    .replaceAll(/<[^>]*>/g, " ")
    .replaceAll(/&nbsp;/g, " ")
    .replaceAll(/&amp;/g, "&")
    .replaceAll(/&lt;/g, "<")
    .replaceAll(/&gt;/g, ">")
    .replaceAll(/\s+/g, " ")
    .trim();
}

/** Plain-text excerpt of a richtext value, truncated on a word boundary. */
export function excerpt(html: string, max = 150): string {
  const text = stripHtml(html);
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 60 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

/** URL of the first image inside a forge entry's `icon` folder, if any. */
export function forgeIconUrl(node: JCRNodeWrapper): string | null {
  if (!node.hasNode("icon")) return null;
  const folder = node.getNode("icon");
  const files = getChildNodes(folder, 1, 0, (n) => n.isNodeType("jnt:file"));
  return files.length > 0 ? buildNodeUrl(files[0]) : null;
}
