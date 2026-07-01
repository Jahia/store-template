import { describe, it, expect } from "vitest";
import { sniffRasterMime, isTrustedRasterImage } from "../src/components/forge/imageSniff";

/**
 * Client-side magic-byte guard for module media uploads. It is a UX-level check only (the
 * authoritative re-validation is server-side in jahia-store's ForgeMediaMimeListener), but it must
 * still reject a spoofed File.type so a renamed SVG/HTML is caught in the browser (SECURITY-571 #28).
 */

function fileOf(bytes: number[], type: string, name = "upload"): File {
  return new File([new Uint8Array(bytes)], name, { type });
}

const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG = [0xff, 0xd8, 0xff, 0xe0];
const GIF = [0x47, 0x49, 0x46, 0x38, 0x39, 0x61];
const WEBP = [0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50];

describe("sniffRasterMime", () => {
  it("detects each allow-listed raster from its signature", async () => {
    expect(await sniffRasterMime(fileOf(PNG, "image/png"))).toBe("image/png");
    expect(await sniffRasterMime(fileOf(JPEG, "image/jpeg"))).toBe("image/jpeg");
    expect(await sniffRasterMime(fileOf(GIF, "image/gif"))).toBe("image/gif");
    expect(await sniffRasterMime(fileOf(WEBP, "image/webp"))).toBe("image/webp");
  });

  it("rejects an SVG regardless of declared type", async () => {
    const svg = [...new TextEncoder().encode("<svg><script>alert(1)</script></svg>")];
    expect(await sniffRasterMime(fileOf(svg, "image/svg+xml"))).toBeNull();
    // Even when the SVG lies about being a PNG:
    expect(await sniffRasterMime(fileOf(svg, "image/png"))).toBeNull();
  });

  it("rejects RIFF containers that are not WEBP", async () => {
    const wav = [0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x41, 0x56, 0x45];
    expect(await sniffRasterMime(fileOf(wav, "image/webp"))).toBeNull();
  });

  it("rejects empty / truncated input", async () => {
    expect(await sniffRasterMime(fileOf([], "image/png"))).toBeNull();
    expect(await sniffRasterMime(fileOf([0x89, 0x50], "image/png"))).toBeNull();
  });
});

describe("isTrustedRasterImage", () => {
  it("accepts a real raster whose declared type matches its bytes", async () => {
    expect(await isTrustedRasterImage(fileOf(PNG, "image/png"))).toBe(true);
  });

  it("rejects a spoofed declared type (SVG bytes claiming image/png)", async () => {
    const svg = [...new TextEncoder().encode("<svg><script>alert(1)</script></svg>")];
    expect(await isTrustedRasterImage(fileOf(svg, "image/png"))).toBe(false);
  });

  it("rejects when the declared type is off the allow-list even if bytes are a raster", async () => {
    expect(await isTrustedRasterImage(fileOf(PNG, "image/svg+xml"))).toBe(false);
  });

  it("rejects when real bytes disagree with an otherwise-allowed declared type", async () => {
    // PNG bytes declared as JPEG — a mismatch, so not trusted.
    expect(await isTrustedRasterImage(fileOf(PNG, "image/jpeg"))).toBe(false);
  });
});
