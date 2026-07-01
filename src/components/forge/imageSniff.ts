/**
 * Client-side magic-byte check for uploaded module media (icons / screenshots).
 *
 * The editor already rejects a picked file whose `File.type` is not an allow-listed raster, but
 * `File.type` is derived from the extension and is trivially spoofable. This reads the file's
 * leading bytes and confirms they match a real raster signature, so a renamed SVG/HTML file is
 * caught in the browser too. It is only a UX guard: the authoritative re-validation runs
 * server-side (`ForgeMediaMimeListener` in `jahia-store`), since any client check can be bypassed
 * by calling the JCR GraphQL mutation directly (SECURITY-571 #28).
 */

/** Canonical MIME types for the accepted raster formats. Mirrors the server allow-list. */
export const ALLOWED_RASTER_MIMES = ["image/png", "image/jpeg", "image/gif", "image/webp"] as const;

/** Enough leading bytes to identify every signature below (WEBP needs bytes 8-11 = "WEBP"). */
const SNIFF_LENGTH = 16;

function startsWith(bytes: Uint8Array, offset: number, signature: number[]): boolean {
  if (bytes.length < offset + signature.length) return false;
  return signature.every((b, i) => bytes[offset + i] === b);
}

/**
 * Detect the raster image type from the file's leading bytes.
 * @returns the canonical MIME type, or `null` when the bytes match no allow-listed raster
 *          signature (SVG, HTML, empty/short input, …).
 */
export async function sniffRasterMime(file: File): Promise<string | null> {
  const buffer = await file.slice(0, SNIFF_LENGTH).arrayBuffer();
  const bytes = new Uint8Array(buffer);
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (startsWith(bytes, 0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  // JPEG: FF D8 FF
  if (startsWith(bytes, 0, [0xff, 0xd8, 0xff])) return "image/jpeg";
  // GIF: "GIF8"
  if (startsWith(bytes, 0, [0x47, 0x49, 0x46, 0x38])) return "image/gif";
  // WEBP: "RIFF" .... "WEBP"
  if (startsWith(bytes, 0, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, 8, [0x57, 0x45, 0x42, 0x50]))
    return "image/webp";
  return null;
}

/**
 * True when the file's declared `File.type` is an allow-listed raster AND its actual bytes match
 * that same type — i.e. the declaration is not spoofed.
 */
export async function isTrustedRasterImage(file: File): Promise<boolean> {
  if (!(ALLOWED_RASTER_MIMES as readonly string[]).includes(file.type)) return false;
  const detected = await sniffRasterMime(file);
  return detected !== null && detected === file.type;
}
