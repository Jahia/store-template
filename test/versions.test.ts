import { describe, it, expect, vi } from "vitest";

// versions.ts imports the Jahia SSR engine library at module load. Stub it: getChildNodes returns
// [] so versionDownloadUrl always takes the MavenProxy-URL branch (no attached jnt:file) — exactly
// the path whose coordinate grammar guard we want to exercise.
vi.mock("@jahia/javascript-modules-library", () => ({
  buildNodeUrl: () => "/file-url",
  getChildNodes: () => [],
  getNodesByJCRQuery: () => [],
}));

const { compareVersionsDesc, versionDownloadUrl } = await import(
  "../src/components/forge/versions"
);

describe("compareVersionsDesc", () => {
  it("orders numerically, not lexicographically (1.10 newer than 1.9)", () => {
    expect(compareVersionsDesc("1.10", "1.9")).toBeLessThan(0);
    expect(compareVersionsDesc("1.9", "1.10")).toBeGreaterThan(0);
  });

  it("treats a shorter version as the lower one (1.0 < 1.0.1)", () => {
    expect(compareVersionsDesc("1.0.1", "1.0")).toBeLessThan(0);
  });

  it("returns 0 for equal versions", () => {
    expect(compareVersionsDesc("2.3.4", "2.3.4")).toBe(0);
  });

  it("sorts a list newest-first", () => {
    const sorted = ["1.0", "2.0", "1.10", "1.9"].sort(compareVersionsDesc);
    expect(sorted).toEqual(["2.0", "1.10", "1.9", "1.0"]);
  });
});

// Minimal JCRNodeWrapper-ish stub: only the methods versionDownloadUrl touches.
function mockVersion({
  groupId = "org.jahia.modules",
  versionNumber = "1.0.0",
  site = "store",
  name = "my-module",
}: Partial<{ groupId: string; versionNumber: string; site: string; name: string }> = {}) {
  const module = {
    hasProperty: (p: string) => p === "groupId",
    getProperty: () => ({ getString: () => groupId }),
    getResolveSite: () => ({ getSiteKey: () => site }),
    getName: () => name,
  };
  return {
    getParent: () => module,
    hasProperty: (p: string) => p === "versionNumber",
    getProperty: () => ({ getString: () => versionNumber }),
    getName: () => versionNumber,
  } as never;
}

describe("versionDownloadUrl (MavenProxy URL grammar guard)", () => {
  it("builds the canonical /modules/mavenproxy/… URL from valid coordinates", () => {
    expect(versionDownloadUrl(mockVersion())).toBe(
      "/modules/mavenproxy/store/org/jahia/modules/my-module/1.0.0/my-module-1.0.0.jar",
    );
  });

  it("returns null when the version carries a path separator", () => {
    expect(versionDownloadUrl(mockVersion({ versionNumber: "1.0/../../secret" }))).toBeNull();
    expect(versionDownloadUrl(mockVersion({ versionNumber: "1.0/evil" }))).toBeNull();
  });

  it("returns null for a bare '..' segment (groupId or version)", () => {
    expect(versionDownloadUrl(mockVersion({ groupId: ".." }))).toBeNull();
    expect(versionDownloadUrl(mockVersion({ versionNumber: ".." }))).toBeNull();
  });

  it("returns null when a coordinate is missing", () => {
    expect(versionDownloadUrl(mockVersion({ groupId: "" }))).toBeNull();
  });
});
