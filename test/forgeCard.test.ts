import { describe, it, expect, vi } from "vitest";

// forgeCard.ts imports the Jahia SSR engine library at module load; stub it so the pure
// text helpers can be imported and tested in a plain Node environment.
vi.mock("@jahia/javascript-modules-library", () => ({
  buildNodeUrl: () => "",
  getChildNodes: () => [],
  server: { osgi: { getService: () => null } },
}));

const { stripHtml, excerpt } = await import("../src/components/forge/forgeCard");

describe("stripHtml", () => {
  it("removes tags and collapses whitespace", () => {
    expect(stripHtml("<p>Hello   <b>world</b></p>")).toBe("Hello world");
  });

  it("unescapes &amp; LAST so &amp;lt; does not double-unescape into '<' (CodeQL js/double-escaping)", () => {
    // The bug this guards: unescaping &amp; first would turn &amp;lt; -> &lt; -> '<'.
    expect(stripHtml("a &amp;lt; b")).toBe("a &lt; b");
    expect(stripHtml("Tom &amp; Jerry")).toBe("Tom & Jerry");
    expect(stripHtml("1 &lt; 2 &gt; 0")).toBe("1 < 2 > 0");
  });

  it("returns an empty string for empty input", () => {
    expect(stripHtml("")).toBe("");
  });
});

describe("excerpt", () => {
  it("returns the full text when within the limit", () => {
    expect(excerpt("<p>short text</p>")).toBe("short text");
  });

  it("truncates on a word boundary with an ellipsis when over the limit", () => {
    const long = `<p>${"word ".repeat(60)}</p>`;
    const out = excerpt(long, 150);
    expect(out.endsWith("…")).toBe(true);
    expect(out.length).toBeLessThanOrEqual(151);
    expect(out).not.toContain("wor…"); // cut on a space, not mid-word
  });
});
