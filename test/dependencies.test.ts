import { describe, it, expect, vi, beforeEach } from "vitest";

// dependencies.ts imports the Jahia SSR engine library at module load, so stub it and hold the
// queries plus their rows in hoisted state. `rowsByCall` answers successive getNodesByJCRQuery
// calls by index, for the tests needing the forward and reverse queries to return different shapes;
// every other test uses the shared `rows`.
const jcr = vi.hoisted(() => ({
  rows: [] as unknown[],
  rowsByCall: [] as unknown[][],
  queries: [] as string[],
}));

vi.mock("@jahia/javascript-modules-library", () => ({
  buildNodeUrl: (n: { getName: () => string }) => `/modules/${n.getName()}.html`,
  getNodesByJCRQuery: (_session: unknown, query: string) => {
    const callIndex = jcr.queries.length;
    jcr.queries.push(query);
    return jcr.rowsByCall[callIndex] ?? jcr.rows;
  },
  getChildNodes: () => [],
}));

const {
  dependencyRefNames,
  duplicateTitles,
  resolveStoreModules,
  forgeDependencies,
  forgeDependants,
  forgeDependencyGraph,
} = await import("../src/components/forge/dependencies");

beforeEach(() => {
  jcr.rows = [];
  jcr.rowsByCall = [];
  jcr.queries = [];
});

/** Minimal jnt:forgeModule stub: only the methods dependencies.ts touches. */
function mockModule({
  name,
  title,
  id,
  published = true,
  deleted = false,
  type = "jnt:forgeModule",
}: {
  name: string;
  title?: string;
  id?: string;
  published?: boolean;
  deleted?: boolean;
  type?: string;
}) {
  const map: Record<string, unknown> = {
    "jcr:title": title ?? name,
    published,
    deleted,
  };
  return {
    getName: () => name,
    getIdentifier: () => id ?? name,
    isNodeType: (t: string) => t === type,
    getResolveSite: () => ({ getPath: () => "/sites/store" }),
    getSession: () => ({}),
    hasProperty: (p: string) => p in map,
    getProperty: (p: string) => ({
      getString: () => String(map[p]),
      getBoolean: () => Boolean(map[p]),
    }),
  } as never;
}

/** Minimal jnt:forgeModuleVersion stub carrying a multi-valued `references`. */
function mockVersion(references: string[], parent?: unknown) {
  return {
    hasProperty: (p: string) => p === "references" && references.length > 0,
    getProperty: () => ({
      getValues: () => references.map((r) => ({ getString: () => r })),
    }),
    getParent: () => parent,
  } as never;
}

describe("dependencyRefNames", () => {
  it("normalizes the writer's untrimmed comma-split of a ranged Jahia-Depends header", () => {
    // CreateEntryFromJar splits "default, seo=[1.1,2)" on "," WITHOUT trimming.
    const version = mockVersion(["default", " seo=[1.1", "2)"]);
    expect(dependencyRefNames(version, "my-module")).toEqual(["default", "seo"]);
  });

  it("drops the legacy 'none' sentinel, whatever its case", () => {
    expect(dependencyRefNames(mockVersion(["none"]), "m")).toEqual([]);
    expect(dependencyRefNames(mockVersion(["NONE"]), "m")).toEqual([]);
  });

  it("never lists the module itself", () => {
    expect(dependencyRefNames(mockVersion(["SEO", "search"]), "seo")).toEqual(["search"]);
  });

  it("de-duplicates case-insensitively", () => {
    expect(dependencyRefNames(mockVersion(["seo", "SEO", "Seo"]), "m")).toEqual(["seo"]);
  });

  it("returns nothing for a module with no versions", () => {
    expect(dependencyRefNames(undefined, "m")).toEqual([]);
  });

  it("rejects names that could break out of a SQL2 literal", () => {
    expect(dependencyRefNames(mockVersion(["ev'il", "ok-name"]), "m")).toEqual(["ok-name"]);
  });
});

describe("resolveStoreModules", () => {
  const self = mockModule({ name: "my-module" });

  it("issues no query at all when nothing is declared", () => {
    expect(resolveStoreModules(self, [])).toEqual([]);
    expect(jcr.queries).toHaveLength(0);
  });

  it("skips names that resolve to no store module, as legacy did", () => {
    // `default` is a platform module: queried, never returned.
    jcr.rows = [mockModule({ name: "search", title: "Content Search" })];
    expect(resolveStoreModules(self, ["default", "search"]).map((l) => l.name)).toEqual(["search"]);
  });

  it("rejects a LIKE over-match instead of linking the wrong module", () => {
    jcr.rows = [mockModule({ name: "seo-extra", title: "Not Asked For" })];
    expect(resolveStoreModules(self, ["seo"])).toEqual([]);
  });

  it("escapes the LIKE wildcard `_`, which is also a legal module-name character", () => {
    resolveStoreModules(self, ["my_mod"]);
    expect(jcr.queries[0]).toContain("LIKE 'my\\_mod'");
  });

  it("orders by title and never lists the module itself or a deleted one", () => {
    jcr.rows = [
      mockModule({ name: "zeta", title: "Zeta" }),
      mockModule({ name: "alpha", title: "Alpha" }),
      mockModule({ name: "my-module", title: "Self" }),
      mockModule({ name: "gone", title: "Gone", deleted: true }),
    ];
    const links = resolveStoreModules(self, ["zeta", "alpha", "my-module", "gone"]);
    expect(links.map((l) => l.title)).toEqual(["Alpha", "Zeta"]);
    expect(links[0].url).toBe("/modules/alpha.html");
  });
});

describe("forgeDependencies", () => {
  // Nothing else calls forgeDependencies directly, so an argument-order slip in the composition
  // would otherwise ship green.
  const self = mockModule({ name: "my-module" });

  it("resolves the newest version's real references to store modules", () => {
    jcr.rows = [mockModule({ name: "search", title: "Content Search" })];
    const version = mockVersion(["search"]);
    expect(forgeDependencies(self, version)).toEqual([
      { name: "search", title: "Content Search", url: "/modules/search.html" },
    ]);
  });

  it("issues no query for the forward direction when the version declares only 'none'", () => {
    expect(forgeDependencies(self, mockVersion(["none"]))).toEqual([]);
    expect(jcr.queries).toHaveLength(0);
  });

  it("issues no query when there is no version at all", () => {
    expect(forgeDependencies(self, undefined)).toEqual([]);
    expect(jcr.queries).toHaveLength(0);
  });
});

describe("forgeDependants", () => {
  const seo = mockModule({ name: "seo", title: "SEO Toolkit" });

  it("finds a dependant that pins a version range - the legacy bug this fixes", () => {
    const luxe = mockModule({ name: "luxe", title: "Luxe Demo" });
    jcr.rows = [mockVersion(["seo=[1.0,2)"], luxe)];
    expect(forgeDependants(seo).map((l) => l.name)).toEqual(["luxe"]);
  });

  it("finds a dependant whose reference kept the writer's leading space", () => {
    const luxe = mockModule({ name: "luxe", title: "Luxe Demo" });
    jcr.rows = [mockVersion([" seo"], luxe)];
    expect(forgeDependants(seo).map((l) => l.name)).toEqual(["luxe"]);
  });

  it("queries all four stored spellings of a reference", () => {
    forgeDependants(seo);
    const q = jcr.queries[0];
    expect(q).toContain("v.[references] = 'seo'");
    expect(q).toContain("v.[references] LIKE 'seo=%'");
    expect(q).toContain("v.[references] = ' seo'");
    expect(q).toContain("v.[references] LIKE ' seo=%'");
  });

  it("re-checks in application code, so an over-matching row is discarded", () => {
    const other = mockModule({ name: "other", title: "Other" });
    jcr.rows = [mockVersion(["seo-extra"], other)];
    expect(forgeDependants(seo)).toEqual([]);
  });

  it("de-duplicates a module that declares the reference in several versions", () => {
    const luxe = mockModule({ name: "luxe", title: "Luxe Demo" });
    jcr.rows = [mockVersion(["seo"], luxe), mockVersion(["seo=[1.0,2)"], luxe)];
    expect(forgeDependants(seo)).toHaveLength(1);
  });

  it("skips itself and unpublished or deleted dependants", () => {
    jcr.rows = [
      mockVersion(["seo"], seo),
      mockVersion(["seo"], mockModule({ name: "draft", published: false })),
      mockVersion(["seo"], mockModule({ name: "gone", deleted: true })),
    ];
    expect(forgeDependants(seo)).toEqual([]);
  });
});

describe("forgeDependencyGraph", () => {
  it("short-circuits to zero queries for a package, which has no references at all", () => {
    const pkg = mockModule({ name: "bundle", type: "jnt:forgePackage" });
    expect(forgeDependencyGraph(pkg, undefined)).toEqual({ dependencies: [], dependants: [] });
    expect(jcr.queries).toHaveLength(0);
  });

  it("costs one query for a module that declares nothing (reverse direction only)", () => {
    const mod = mockModule({ name: "seo" });
    forgeDependencyGraph(mod, mockVersion(["none"]));
    expect(jcr.queries).toHaveLength(1);
  });

  it("resolves both directions to their own content in exactly two queries", () => {
    const core = mockModule({ name: "core", title: "Core" });
    // Call 0 is the forward query (jnt:forgeModule), call 1 the reverse (jnt:forgeModuleVersion).
    jcr.rowsByCall = [
      [mockModule({ name: "extra", title: "Extra Module" })],
      [mockVersion(["core"], mockModule({ name: "downstream", title: "Downstream" }))],
    ];
    const result = forgeDependencyGraph(core, mockVersion(["extra"]));
    expect(jcr.queries).toHaveLength(2);
    expect(result.dependencies).toEqual([
      { name: "extra", title: "Extra Module", url: "/modules/extra.html" },
    ]);
    expect(result.dependants).toEqual([
      { name: "downstream", title: "Downstream", url: "/modules/downstream.html" },
    ]);
  });
});

describe("duplicateTitles", () => {
  const link = (name: string, title: string) => ({ name, title, url: `/modules/${name}.html` });

  it("flags only the titles that actually collide", () => {
    const dupes = duplicateTitles([link("seo", "SEO"), link("seo-pro", "SEO"), link("search", "Search")]);
    expect([...dupes]).toEqual(["SEO"]);
  });

  it("returns nothing when every title is unique", () => {
    expect(duplicateTitles([link("a", "Alpha"), link("b", "Beta")]).size).toBe(0);
  });

  it("handles an empty column", () => {
    expect(duplicateTitles([]).size).toBe(0);
  });

  it("counts a title colliding three times once", () => {
    const dupes = duplicateTitles([link("a", "Same"), link("b", "Same"), link("c", "Same")]);
    expect([...dupes]).toEqual(["Same"]);
  });

  it("does not mistake a module titled __proto__ for a collision", () => {
    // A plain object literal would read Object.prototype instead of a count.
    expect(duplicateTitles([link("weird", "__proto__")]).size).toBe(0);
    expect([...duplicateTitles([link("a", "__proto__"), link("b", "__proto__")])]).toEqual([
      "__proto__",
    ]);
  });
});
