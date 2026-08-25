import { describe, it, expect, vi, beforeEach } from "vitest";

// dependencies.ts imports the Jahia SSR engine library at module load, so stub it and hold the
// queries plus their rows in hoisted state. `rowsByCall` answers successive getNodesByJCRQuery
// calls by index, for the tests needing the forward and reverse queries to return different shapes;
// every other test uses the shared `rows`. `caps` records the third argument (the scan limit) per
// call, so a swapped/dropped cap is visible to a test instead of silently accepted.
const jcr = vi.hoisted(() => ({
  rows: [] as unknown[],
  rowsByCall: [] as unknown[][],
  queries: [] as string[],
  caps: [] as number[],
}));

vi.mock("@jahia/javascript-modules-library", () => ({
  buildNodeUrl: (n: { getName: () => string }) => `/modules/${n.getName()}.html`,
  getNodesByJCRQuery: (_session: unknown, query: string, cap: number) => {
    const callIndex = jcr.queries.length;
    jcr.queries.push(query);
    jcr.caps.push(cap);
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
  jcr.caps = [];
});

/** Minimal jnt:forgeModule stub: only the methods dependencies.ts touches. */
function mockModule({
  name,
  title,
  id,
  published = true,
  deleted = false,
  type = "jnt:forgeModule",
  throwsOnIdentifier = false,
}: {
  name: string;
  title?: string;
  id?: string;
  published?: boolean;
  deleted?: boolean;
  type?: string;
  throwsOnIdentifier?: boolean;
}) {
  const map: Record<string, unknown> = {
    "jcr:title": title ?? name,
    published,
    deleted,
  };
  return {
    getName: () => name,
    getIdentifier: () => {
      if (throwsOnIdentifier) throw new Error("unreadable node");
      return id ?? name;
    },
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

/** A version whose getParent() throws, to exercise the reverse-direction catch. */
function mockVersionWithThrowingParent(references: string[]) {
  return {
    hasProperty: (p: string) => p === "references" && references.length > 0,
    getProperty: () => ({
      getValues: () => references.map((r) => ({ getString: () => r })),
    }),
    getParent: () => {
      throw new Error("dangling parent");
    },
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

  it("caps the declared-reference list at REF_CAP (40)", () => {
    const refs = Array.from({ length: 45 }, (_, i) => `dep${i}`);
    expect(dependencyRefNames(mockVersion(refs), "m")).toHaveLength(40);
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

  it("carries the node identifier on each link (id, not just name, is the stable key)", () => {
    jcr.rows = [mockModule({ name: "search", title: "Content Search", id: "uuid-search" })];
    expect(resolveStoreModules(self, ["search"])[0].id).toBe("uuid-search");
  });

  // Fix 2: names must be lowercased inside the function itself, not just by callers that happen
  // to pre-lowercase. Without that, `LOWER(LOCALNAME(m)) LIKE 'SEO'` never matches a node named
  // "seo", and `wanted.has("seo")` (built from the un-lowercased "SEO") never matches either.
  it("resolves a mixed-case input name (Fix 2)", () => {
    jcr.rows = [mockModule({ name: "seo", title: "SEO Toolkit" })];
    expect(resolveStoreModules(self, ["SEO"]).map((l) => l.name)).toEqual(["seo"]);
  });

  it("drops an unpublished row even though the query clause already filters on published (Fix 4)", () => {
    jcr.rows = [mockModule({ name: "search", title: "Content Search", published: false })];
    expect(resolveStoreModules(self, ["search"])).toEqual([]);
  });

  it("skips a module that throws reading its identifier, but keeps well-formed rows", () => {
    jcr.rows = [
      mockModule({ name: "bad", title: "Bad", throwsOnIdentifier: true }),
      mockModule({ name: "search", title: "Content Search" }),
    ];
    expect(resolveStoreModules(self, ["bad", "search"]).map((l) => l.name)).toEqual(["search"]);
  });

  it("passes RESOLVE_SCAN_CAP as the query's scan-limit argument", () => {
    resolveStoreModules(self, ["search"]);
    expect(jcr.caps[0]).toBe(200);
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
      { id: "search", name: "search", title: "Content Search", url: "/modules/search.html" },
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

  // Regression test: a direct probe against the live backend established that LOWER() IS applied
  // per-value on this multi-valued property, so the query must use a single LOWER()'d pattern
  // rather than enumerating case-spelling variants.
  it("is case-insensitive: a manifest reference stored as 'SEO' still resolves as a dependant of 'seo'", () => {
    const luxe = mockModule({ name: "luxe", title: "Luxe Demo" });
    jcr.rows = [mockVersion(["SEO"], luxe)];
    expect(forgeDependants(seo).map((l) => l.name)).toEqual(["luxe"]);
  });

  it("resolves a dependant that stored the reference in ALL CAPS ('BASE' for module 'base')", () => {
    const base = mockModule({ name: "base", title: "Base" });
    const other = mockModule({ name: "other", title: "Other" });
    jcr.rows = [mockVersion(["other", "BASE"], other)];
    expect(forgeDependants(base).map((l) => l.name)).toEqual(["other"]);
  });

  it("resolves a dependant whose reference kept the writer's leading space, in any case", () => {
    const base = mockModule({ name: "base", title: "Base" });
    const other = mockModule({ name: "other", title: "Other" });
    jcr.rows = [mockVersion([" base"], other)];
    expect(forgeDependants(base).map((l) => l.name)).toEqual(["other"]);
  });

  it("queries exactly the two LOWER()'d, prefix-bounded terms - trimmed and leading-space", () => {
    forgeDependants(seo);
    const q = jcr.queries[0];
    expect(q).toContain("LOWER(v.[references]) LIKE 'seo%'");
    expect(q).toContain("LOWER(v.[references]) LIKE ' seo%'");
    // No case-spelling variants and no exact/ranged-spelling terms.
    expect(q).not.toContain("SEO");
    expect(q).not.toContain("Seo");
    expect(q).not.toContain("v.[references] = 'seo'");
    expect(q).not.toContain("v.[references] LIKE 'seo=%'");
    expect(q.split(" OR ")).toHaveLength(2);
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

  it("skips a version whose parent throws (dangling/unreadable), but keeps well-formed rows", () => {
    const luxe = mockModule({ name: "luxe", title: "Luxe Demo" });
    jcr.rows = [mockVersionWithThrowingParent(["seo"]), mockVersion(["seo"], luxe)];
    expect(forgeDependants(seo).map((l) => l.name)).toEqual(["luxe"]);
  });

  it("carries the parent module's identifier on each link", () => {
    const luxe = mockModule({ name: "luxe", title: "Luxe Demo", id: "uuid-luxe" });
    jcr.rows = [mockVersion(["seo"], luxe)];
    expect(forgeDependants(seo)[0].id).toBe("uuid-luxe");
  });

  it("passes DEPENDANT_SCAN_CAP as the query's scan-limit argument", () => {
    forgeDependants(seo);
    expect(jcr.caps[0]).toBe(2000);
  });

  it("caps the rendered dependant list at DEPENDANT_CAP (40)", () => {
    jcr.rows = Array.from({ length: 45 }, (_, i) =>
      mockVersion(["seo"], mockModule({ name: `dep${i}`, title: `Dep${i}` })),
    );
    expect(forgeDependants(seo)).toHaveLength(40);
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
    const core = mockModule({ name: "core", title: "Core", id: "uuid-core" });
    // Call 0 is the forward query (jnt:forgeModule), call 1 the reverse (jnt:forgeModuleVersion).
    jcr.rowsByCall = [
      [mockModule({ name: "extra", title: "Extra Module", id: "uuid-extra" })],
      [mockVersion(["core"], mockModule({ name: "downstream", title: "Downstream", id: "uuid-downstream" }))],
    ];
    const result = forgeDependencyGraph(core, mockVersion(["extra"]));
    expect(jcr.queries).toHaveLength(2);
    // Forward query capped at RESOLVE_SCAN_CAP, reverse at DEPENDANT_SCAN_CAP - a swapped or
    // dropped cap would be invisible without this.
    expect(jcr.caps).toEqual([200, 2000]);
    expect(result.dependencies).toEqual([
      { id: "uuid-extra", name: "extra", title: "Extra Module", url: "/modules/extra.html" },
    ]);
    expect(result.dependants).toEqual([
      { id: "uuid-downstream", name: "downstream", title: "Downstream", url: "/modules/downstream.html" },
    ]);
  });

  // Fix 5: node.getResolveSite().getPath() is unguarded in both query functions. A module whose
  // site can't be resolved must degrade the whole detail page's dependency graph to empty rather
  // than throw and 500 the anonymous render.
  it("degrades to empty lists instead of throwing when the site can't be resolved (Fix 5)", () => {
    const orphan = {
      getName: () => "orphan",
      isNodeType: (t: string) => t === "jnt:forgeModule",
      getResolveSite: () => {
        throw new Error("site unresolvable");
      },
      getSession: () => ({}),
      getIdentifier: () => "orphan",
    } as never;
    expect(forgeDependencyGraph(orphan, mockVersion(["seo"]))).toEqual({
      dependencies: [],
      dependants: [],
    });
  });
});

describe("duplicateTitles", () => {
  const link = (name: string, title: string) => ({ id: name, name, title, url: `/modules/${name}.html` });

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
