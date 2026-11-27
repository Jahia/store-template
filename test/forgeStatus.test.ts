import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";

// forgeFacets.ts imports the Jahia SSR engine library at module load; stub it so the pure
// status helpers can be imported and tested in a plain Node environment.
vi.mock("@jahia/javascript-modules-library", () => ({
  getChildNodes: () => [],
  server: { osgi: { getService: () => null } },
}));

const { FORGE_STATUSES, forgeStatusLabel } = await import("../src/components/forge/forgeFacets");

const LOCALES_DIR = join(__dirname, "..", "settings", "locales");

const locales = readdirSync(LOCALES_DIR)
  .filter((file) => file.endsWith(".json"))
  .map((file) => ({
    file,
    statuses: (JSON.parse(readFileSync(join(LOCALES_DIR, file), "utf8")) as {
      statuses?: Record<string, string>;
    }).statuses,
  }));

describe("forgeStatusLabel", () => {
  // A stand-in for i18next's t: the label when the key exists, else the default value.
  const labels: Record<string, string> = { "statuses.community-reviewed": "Community (reviewed)" };
  const t = (key: string, options: { defaultValue: string }) => labels[key] ?? options.defaultValue;

  it("shows the label of a status", () => {
    expect(forgeStatusLabel(t, "community-reviewed")).toBe("Community (reviewed)");
  });

  it("finds the label of a capitalized value, as migrated data stores it", () => {
    expect(forgeStatusLabel(t, "Community-Reviewed")).toBe("Community (reviewed)");
  });

  it("shows a value with no label as stored", () => {
    expect(forgeStatusLabel(t, "unknown")).toBe("unknown");
  });
});

describe("status labels", () => {
  it.each(locales)("$file: labels every status the storefront offers", ({ statuses }) => {
    for (const status of FORGE_STATUSES) {
      expect(statuses?.[status], `statuses.${status} is missing`).toBeTypeOf("string");
    }
  });

  it.each(locales)("$file: shows community-reviewed as Community (reviewed)", ({ statuses }) => {
    expect(statuses?.["community-reviewed"]).toBe("Community (reviewed)");
  });
});
