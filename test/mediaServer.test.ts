import { describe, it, expect, vi } from "vitest";

/**
 * JSTORE-SEC-012 product rule, server side: SVG and HTML are never accepted as module media, so the
 * storefront never links one as an icon or a screenshot, even one stored before the rule existed. The
 * engine library is stubbed; getChildNodes applies its filter before its limit, like the engine does.
 */
interface FakeNode {
  name: string;
  url: string;
  mime: string | null;
  type: string;
  children: FakeNode[];
}

vi.mock("@jahia/javascript-modules-library", () => ({
  buildNodeUrl: (n: FakeNode) => n.url,
  getChildNodes: (n: FakeNode, limit: number, _offset: number, filter: (c: unknown) => boolean) =>
    n.children.map(asJcr).filter(filter).slice(0, limit < 0 ? undefined : limit),
  server: { osgi: { getService: () => null } },
}));

/** A minimal JCRNodeWrapper over a fake node (only the calls the helpers make). */
function asJcr(n: FakeNode): unknown {
  const content = n.mime === null ? null : { hasProperty: () => true, getProperty: () => ({ getString: () => n.mime }) };
  return {
    ...n,
    getName: () => n.name,
    isNodeType: (t: string) => t === n.type,
    hasNode: (child: string) =>
      child === "jcr:content" ? content !== null : n.children.some((c) => c.name === child),
    getNode: (child: string) => (child === "jcr:content" ? content : asJcr(n.children.find((c) => c.name === child)!)),
  };
}

const file = (name: string, mime: string | null): FakeNode => ({
  name,
  url: `/files/${name}`,
  mime,
  type: "jnt:file",
  children: [],
});
const moduleWithIcons = (...files: FakeNode[]) =>
  asJcr({ name: "m", url: "", mime: null, type: "jnt:forgeModule", children: [{ ...file("icon", null), type: "jnt:folder", children: files }] });

const { forgeIconUrl, isDisplayableMedia } = await import("../src/components/forge/forgeCard");

describe("isDisplayableMedia", () => {
  it.each([
    ["logo.png", "image/png"],
    ["photo.jpg", "image/jpeg"],
    ["anim.gif", "image/gif"],
    ["shot.webp", "image/webp"],
    ["legacy", null],
  ])("keeps %s (%s)", (name, mime) => {
    expect(isDisplayableMedia(asJcr(file(name, mime)) as never)).toBe(true);
  });

  it.each([
    ["logo.svg", "image/png"],
    ["page.html", "image/png"],
    ["logo.png", "image/svg+xml"],
    ["logo.png", "text/html"],
    ["logo.png", "application/xhtml+xml"],
  ])("drops %s (%s)", (name, mime) => {
    expect(isDisplayableMedia(asJcr(file(name, mime)) as never)).toBe(false);
  });
});

describe("forgeIconUrl", () => {
  it("never links an SVG icon", () => {
    expect(forgeIconUrl(moduleWithIcons(file("logo.svg", "image/svg+xml")) as never)).toBeNull();
  });

  it("skips an SVG/HTML file and links the first raster", () => {
    expect(
      forgeIconUrl(moduleWithIcons(file("evil.html", "text/html"), file("logo.png", "image/png")) as never),
    ).toBe("/files/logo.png");
  });

  it("links a raster icon", () => {
    expect(forgeIconUrl(moduleWithIcons(file("logo.webp", "image/webp")) as never)).toBe("/files/logo.webp");
  });
});
