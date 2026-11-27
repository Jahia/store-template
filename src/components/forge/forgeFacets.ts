import { getChildNodes } from "@jahia/javascript-modules-library";
import type { JCRSessionWrapper } from "org.jahia.services.content";
import { forgeRootCategoryUuid } from "./forgeBranding";

/**
 * The status facet options and editor choices. A deliberate subset of the `jmix:forgeElement`
 * status choicelist (definitions.cnd): `prereleased` is intentionally omitted from the UI —
 * the CND still permits it for existing/migrated data, but it is no longer offered as
 * a filter facet or editor choice.
 */
export const FORGE_STATUSES: readonly string[] = [
  "community",
  "community-reviewed",
  "labs",
  "supported",
  "legacy",
];

/**
 * The visible label of a stored status, from the `statuses` locale map. Migrated 4.3.0 data can
 * store a capitalized value ("Supported"), so the lookup is case-insensitive; a value with no
 * label shows as stored.
 */
export function forgeStatusLabel(
  t: (key: string, options: { defaultValue: string }) => string,
  status: string,
): string {
  return t(`statuses.${status.toLowerCase()}`, { defaultValue: status });
}

export interface ForgeCategoryOption {
  uuid: string;
  name: string;
}

/**
 * The site's root-category children — the category facet options for the storefront
 * filter rail. Returns [] when no root category is configured or it is unreadable.
 * Sorted alphabetically by (locale-aware) display name so the facet is easy to scan;
 * `localeCompare` also satisfies the sort-with-comparator rule (S2871).
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
  return options.sort((a, b) => a.name.localeCompare(b.name));
}
