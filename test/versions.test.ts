import { describe, it, expect, vi } from "vitest";

// versions.ts imports the Jahia SSR engine library at module load. Stub it: getChildNodes returns
// [] so versionDownloadUrl always takes the MavenProxy-URL branch (no attached jnt:file) — exactly
// the path whose coordinate grammar guard we want to exercise.
vi.mock("@jahia/javascript-modules-library", () => ({
  buildNodeUrl: () => "/file-url",
  getChildNodes: () => [],
  getNodesByJCRQuery: () => [],
}));

const { compareVersionsDesc, versionDownloadUrl, latestReleaseDate } = await import(
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

/** Version-node stub carrying just the properties latestReleaseDate reads. */
function mockRelease(props: Record<string, string | boolean>) {
  return {
    hasProperty: (name: string) => Object.hasOwn(props, name),
    getProperty: (name: string) => ({
      getString: () => String(props[name]),
      getBoolean: () => props[name] === true,
    }),
  } as never;
}

describe("latestReleaseDate (module-level 'Released' date)", () => {
  it("ignores drafts, so an owner and a visitor see the same date", () => {
    const versions = [
      mockRelease({ published: false, uploadDate: "2026-09-01T10:00:00.000+02:00" }),
      mockRelease({ published: true, uploadDate: "2026-03-04T10:00:00.000+02:00" }),
    ];
    expect(latestReleaseDate(versions)).toBe("2026-03-04");
  });

  it("takes the most recent release in TIME, not the highest version number", () => {
    const versions = [
      mockRelease({ published: true, uploadDate: "2026-01-10T10:00:00.000+02:00" }), // 5.0.0
      mockRelease({ published: true, uploadDate: "2026-06-22T10:00:00.000+02:00" }), // 4.9.1
    ];
    expect(latestReleaseDate(versions)).toBe("2026-06-22");
  });

  it("falls back to jcr:lastModified for versions with no uploadDate", () => {
    const versions = [mockRelease({ published: true, "jcr:lastModified": "2026-02-02T10:00:00Z" })];
    expect(latestReleaseDate(versions)).toBe("2026-02-02");
  });

  it("returns '' when every version is still a draft", () => {
    const drafts = [mockRelease({ published: false, uploadDate: "2026-09-01T10:00:00.000+02:00" })];
    expect(latestReleaseDate(drafts)).toBe("");
  });

  it("returns '' for a module with no versions at all", () => {
    expect(latestReleaseDate([])).toBe("");
  });
});
