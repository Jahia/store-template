import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  MEDIA_ACCEPT,
  checkMediaFile,
  mediaRejectionMessage,
  trustedRasterMime,
} from "../src/components/forge/imageSniff";
import IconUpload, { type IconLabels } from "../src/components/forge/IconUpload";
import ScreenshotManager, { type ScreenshotLabels } from "../src/components/forge/ScreenshotManager.client";

/**
 * JSTORE-SEC-012 product rule: SVG and HTML are never accepted as module media (icons, screenshots).
 * The browser refuses them before upload, by file type, by extension and by content, and only the four
 * raster types stay accepted. The server (jahia-store's ForgeMediaMimeListener) applies the same rule.
 */

const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d, 0x49, 0x48, 0x44, 0x52];
const JPEG = [0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46];
const GIF = [0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 1, 0, 1, 0];
const WEBP = [0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x20];

const text = (s: string) => [...new TextEncoder().encode(s)];
const fileOf = (bytes: number[], name: string, type: string) => new File([new Uint8Array(bytes)], name, { type });

describe("checkMediaFile accepts the four raster types", () => {
  it.each([
    ["logo.png", PNG, "image/png", "image/png"],
    ["photo.jpg", JPEG, "image/jpeg", "image/jpeg"],
    ["photo.JPEG", JPEG, "image/jpeg", "image/jpeg"],
    ["anim.gif", GIF, "image/gif", "image/gif"],
    ["shot.webp", WEBP, "image/webp", "image/webp"],
    // A real WebP named .png (assets/icon.png in the E2E suite): the bytes decide the stored type.
    ["icon.png", WEBP, "image/png", "image/webp"],
  ])("%s", async (name, bytes, type, expected) => {
    expect(await checkMediaFile(fileOf(bytes as number[], name as string, type as string))).toEqual({
      ok: true,
      mime: expected,
    });
  });
});

describe("checkMediaFile refuses SVG and HTML", () => {
  it.each(["logo.svg", "LOGO.SVG", "logo.svgz", "page.html", "page.HTM", "page.xhtml", "page.xht", "page.shtml"])(
    "by extension, even with raster bytes and type: %s",
    async (name) => {
      expect(await checkMediaFile(fileOf(PNG, name, "image/png"))).toEqual({ ok: false, reason: "svgHtml" });
    },
  );

  it.each(["image/svg+xml", "text/html", "application/xhtml+xml", "IMAGE/SVG+XML", "text/html; charset=utf-8"])(
    "by file type, even with raster bytes and a raster name: %s",
    async (type) => {
      expect(await checkMediaFile(fileOf(PNG, "logo.png", type))).toEqual({ ok: false, reason: "svgHtml" });
    },
  );

  it.each([
    ["an SVG named .png", text('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>')],
    ["an HTML document named .png", text("<!DOCTYPE html><p>x</p>")],
    ["HTML after leading text", text("hello <HTML><body>")],
    ["a script tag", text("x<SCRIPT>alert(1)</SCRIPT>")],
    ["a GIF/HTML polyglot", [...GIF, ...text("<html><script>alert(1)</script></html>")]],
    ["a PNG with an SVG further on", [...PNG, ...new Array(100).fill(0), ...text("<svg onload=alert(1)>")]],
  ])("by content: %s", async (_label, bytes) => {
    expect(await checkMediaFile(fileOf(bytes, "logo.png", "image/png"))).toEqual({ ok: false, reason: "svgHtml" });
  });
});

describe("checkMediaFile refuses other non-raster files", () => {
  it("plain text named .png", async () => {
    expect(await checkMediaFile(fileOf(text("not an image"), "logo.png", "image/png"))).toEqual({
      ok: false,
      reason: "notRaster",
    });
  });

  it("an empty file", async () => {
    expect(await checkMediaFile(fileOf([], "logo.png", "image/png"))).toEqual({ ok: false, reason: "notRaster" });
  });
});

describe("trustedRasterMime applies the same rule", () => {
  it("refuses raster bytes named .svg", async () => {
    expect(await trustedRasterMime(fileOf(PNG, "logo.svg", "image/png"))).toBeNull();
  });
});

describe("MEDIA_ACCEPT", () => {
  it("lists the four raster types and their extensions only", () => {
    const entries = MEDIA_ACCEPT.split(",");
    expect(entries).toEqual(
      expect.arrayContaining(["image/png", "image/jpeg", "image/gif", "image/webp", ".png", ".jpg", ".jpeg", ".gif", ".webp"]),
    );
    expect(MEDIA_ACCEPT).not.toMatch(/svg|html|\*/i);
  });
});

describe("mediaRejectionMessage", () => {
  const labels = { invalidType: "INVALID", svgHtmlRefused: "SVG_HTML" };

  it("names SVG and HTML when the file is SVG or HTML", () => {
    expect(mediaRejectionMessage("svgHtml", labels)).toBe("SVG_HTML");
  });

  it("uses the generic message for another non-raster", () => {
    expect(mediaRejectionMessage("notRaster", labels)).toBe("INVALID");
  });
});

describe("the upload inputs only offer raster files", () => {
  const iconLabels: IconLabels = {
    label: "Icon",
    choose: "Choose",
    upload: "Upload",
    uploading: "Uploading",
    uploaded: "Uploaded",
    error: "Error",
    current: "Current",
    none: "None",
    tooLarge: "Too large",
    invalidType: "Invalid",
    svgHtmlRefused: "SVG and HTML refused",
  };
  const screenshotLabels: ScreenshotLabels = {
    empty: "Empty",
    add: "Add",
    uploading: "Uploading",
    tooLarge: "Too large",
    invalidType: "Invalid",
    svgHtmlRefused: "SVG and HTML refused",
    moveUp: "Up",
    moveDown: "Down",
    delete: "Delete",
    confirmPrompt: "Delete?",
    confirm: "Confirm",
    cancel: "Cancel",
    error: "Error",
  };
  const acceptOf = (html: string) => /accept="([^"]*)"/.exec(html)?.[1];

  it("icon upload", () => {
    const html = renderToStaticMarkup(
      createElement(IconUpload, { path: "/sites/s/m", workspace: "LIVE", iconUrl: null, labels: iconLabels }),
    );
    expect(acceptOf(html)).toBe(MEDIA_ACCEPT);
  });

  it("screenshot upload", () => {
    const html = renderToStaticMarkup(
      createElement(ScreenshotManager, { path: "/sites/s/m/screenshots", workspace: "LIVE", items: [], labels: screenshotLabels }),
    );
    expect(acceptOf(html)).toBe(MEDIA_ACCEPT);
  });
});
