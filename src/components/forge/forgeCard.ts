import { buildNodeUrl, getChildNodes, server } from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";

/**
 * Strip HTML tags + collapse whitespace from a Jahia richtext value.
 * `&amp;` is unescaped LAST: doing it first turns `&amp;lt;` into `&lt;` and then
 * into `<` — a double-unescape (CodeQL js/double-escaping).
 */
export function stripHtml(html: string): string {
  return (html || "")
    .replaceAll(/<[^>]*>/g, " ")
    .replaceAll("&nbsp;", " ")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&")
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

/**
 * Displayable names of the categories a forge entry is filed under
 * (`j:defaultCategory`, a multi-valued weakreference from jmix:categorized).
 * Resolving a weakreference can dangle, so each lookup is guarded. Used both for
 * the card's `data-categories` (client filtering) and for the storefront's
 * category facet list - kept here so both compute it identically.
 */
export function forgeCategoryNames(node: JCRNodeWrapper): string[] {
  if (!node.hasProperty("j:defaultCategory")) return [];
  const session = node.getSession();
  const names: string[] = [];
  try {
    for (const value of node.getProperty("j:defaultCategory").getValues()) {
      try {
        names.push(session.getNodeByIdentifier(value.getString()).getDisplayableName());
      } catch {
        // Dangling reference - skip.
      }
    }
  } catch {
    // Not a multi-valued property in this content - ignore.
  }
  return names;
}

/** A Jahia user-node property of the module's creator (read via the user manager), or "". */
function authorProfileProperty(node: JCRNodeWrapper, username: string, property: string): string {
  try {
    const service = server.osgi.getService("org.jahia.services.usermanager.JahiaUserManagerService");
    if (!service) return "";
    const siteKey = node.getResolveSite().getSiteKey();
    // Site-scoped lookup first (site users), then the global directory.
    const user = service.lookupUser(username, siteKey) ?? service.lookupUser(username);
    if (!user) return "";
    return user.getPropertyAsString(property) || "";
  } catch {
    return "";
  }
}

/**
 * Author label shown on a card / detail page: the module's developer (its creator),
 * rendered according to the per-module `authorNameDisplayedAs` choice.
 *
 * The CND choicelist values are fixed (we must not change the CND), so they are
 * mapped to the three product display modes via the creator's Jahia user profile:
 *   - "username"     → the user's email (j:email)
 *   - "fullName"     → first + last name (j:firstName j:lastName)
 *   - "organisation" → the organization (j:organization)
 * Any chosen field that is empty/unreadable (e.g. anonymous SSR) falls back to the
 * username, so a name is always shown.
 */
export function forgeAuthor(node: JCRNodeWrapper): string {
  try {
    const username = node.getPropertyAsString("jcr:createdBy") || "";
    if (!username) return "";
    const mode = node.hasProperty("authorNameDisplayedAs")
      ? node.getProperty("authorNameDisplayedAs").getString()
      : "username";
    if (mode === "fullName") {
      const first = authorProfileProperty(node, username, "j:firstName");
      const last = authorProfileProperty(node, username, "j:lastName");
      const full = [first, last].filter(Boolean).join(" ").trim();
      return full || username;
    }
    if (mode === "organisation") {
      return authorProfileProperty(node, username, "j:organization") || username;
    }
    // "username" (default): show the user's email, falling back to the login name.
    return authorProfileProperty(node, username, "j:email") || username;
  } catch {
    return "";
  }
}
