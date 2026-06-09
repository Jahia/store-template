import { getChildNodes } from "@jahia/javascript-modules-library";
import type { JCRSessionWrapper } from "org.jahia.services.content";
import { forgeRootCategoryUuid } from "./forgeBranding";

/**
 * The status facet options. A deliberate subset of the `jmix:forgeElement` status
 * choicelist (definitions.cnd): `prereleased` is intentionally omitted from the UI —
 * the CND still permits it for existing/migrated data, but it is no longer offered as
 * a filter facet or editor choice.
 */
export const FORGE_STATUSES: readonly string[] = [
  "community",
  "labs",
  "supported",
  "legacy",
];

export interface ForgeCategoryOption {
  uuid: string;
  name: string;
}

/**
 * The site's root-category children — the category facet options for the storefront
 * filter and the header advanced-search panel. Returns [] when no root category is
 * configured or it is unreadable. Kept here so both surfaces compute it identically.
 */
export function forgeCategoryOptions(
  siteKey: string,
  session: JCRSessionWrapper,
): ForgeCategoryOption[] {
  const rootUuid = forgeRootCategoryUuid(siteKey);
  if (!rootUuid) return [];
  const options: ForgeCategoryOption[] = [];
  try {
    const root = session.getNodeByIdentifier(rootUuid);
    for (const c of getChildNodes(root, 200, 0, (n) => n.isNodeType("jnt:category"))) {
      options.push({ uuid: c.getIdentifier(), name: c.getDisplayableName() });
    }
  } catch {
    // root category missing / not readable — no category facet.
  }
  return options;
}
