/**
 * Client-side magic-byte check for uploaded module media (icons / screenshots).
 *
 * The editor already rejects a picked file whose `File.type` is not an allow-listed raster, but
 * `File.type` is derived from the extension and is trivially spoofable. This reads the file's
 * leading bytes and confirms they match a real raster signature, so a renamed SVG/HTML file is
 * caught in the browser too. SVG and HTML are refused outright, by extension, type and content
 * (JSTORE-SEC-012). It is only a UX guard: the authoritative re-validation runs
 * server-side (`ForgeMediaMimeListener` in `jahia-store`), since any client check can be bypassed
 * by calling the JCR GraphQL mutation directly (SECURITY-571 #28).
 */

/** Canonical MIME types for the accepted raster formats. Mirrors the server allow-list. */
export const ALLOWED_RASTER_MIMES = ["image/png", "image/jpeg", "image/gif", "image/webp"] as const;

/** File extensions of the accepted raster formats. */
const ALLOWED_RASTER_EXTENSIONS = [".png", ".jpg", ".jpeg", ".gif", ".webp"] as const;

/**
 * The `accept` list of the icon and screenshot file inputs: the four raster types and their extensions,
 * never SVG or HTML (JSTORE-SEC-012). `accept` only filters the picker; {@link checkMediaFile} is the check.
 */
export const MEDIA_ACCEPT = [...ALLOWED_RASTER_MIMES, ...ALLOWED_RASTER_EXTENSIONS].join(",");

/** SVG and HTML file extensions (lower case). Mirrors jahia-store's MagicByteImageValidator. */
const SVG_HTML_EXTENSIONS = ["svg", "svgz", "html", "htm", "xhtml", "xht", "shtml"];

/** SVG and HTML MIME types (lower case, without parameters). */
const SVG_HTML_MIMES = ["image/svg+xml", "text/html", "application/xhtml+xml"];

/** Lower-case tokens that mark SVG or HTML content anywhere in the sniffed bytes. */
const SVG_HTML_TOKENS = ["<svg", "<!doctype html", "<html", "<script"];

/** Bytes read for the content check; matches the server's sniff window. */
const MARKUP_SNIFF_LENGTH = 512;

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
 * The trustworthy MIME type to store for an uploaded file: the type detected from its actual bytes
 * when they are an allow-listed raster, else `null` (reject the upload).
 *
 * We deliberately trust the sniffed bytes over the browser-supplied `File.type`: `File.type` is
 * derived from the extension and is often wrong for legitimate files (e.g. a real WebP saved as
 * `logo.png` → the browser reports `image/png`). Any of the four allow-listed rasters is safe to
 * store/serve, so a mismatch between declared and detected type is not a security problem — only a
 * *non-raster* (SVG/HTML/…) is. Uploading the detected type also keeps `jcr:mimeType` correct from
 * the start (the server listener would otherwise have to correct it).
 */
export async function trustedRasterMime(file: File): Promise<string | null> {
  const check = await checkMediaFile(file);
  return check.ok ? check.mime : null;
}

/** Why a picked file is refused: SVG or HTML (never accepted), or another non-raster file. */
export type MediaRejection = "svgHtml" | "notRaster";

export type MediaCheck = { ok: true; mime: string } | { ok: false; reason: MediaRejection };

function isSvgOrHtmlName(name: string): boolean {
  const dot = name.lastIndexOf(".");
  return dot >= 0 && SVG_HTML_EXTENSIONS.includes(name.slice(dot + 1).toLowerCase());
}

function isSvgOrHtmlType(type: string): boolean {
  return SVG_HTML_MIMES.includes(type.split(";")[0].trim().toLowerCase());
}

/**
 * True when a media file is SVG or HTML by its name or its MIME type. Used server-side, where the stored
 * `jcr:mimeType` and node name are at hand, to never link such a file as an icon or screenshot.
 */
export function isSvgOrHtmlMedia(name: string, type: string): boolean {
  return isSvgOrHtmlName(name) || isSvgOrHtmlType(type);
}

async function containsSvgOrHtmlMarkup(file: File): Promise<boolean> {
  const buffer = await file.slice(0, MARKUP_SNIFF_LENGTH).arrayBuffer();
  // latin1 maps every byte to one character, so the tokens are found whatever the rest of the bytes are.
  const head = new TextDecoder("latin1").decode(buffer).toLowerCase();
  return SVG_HTML_TOKENS.some((token) => head.includes(token));
}

/**
 * Checks a file picked as module media (icon or screenshot) before it is uploaded. SVG and HTML are never
 * accepted (JSTORE-SEC-012), whether the file says so by its extension, its type or its content; any other
 * file must be one of the four allow-listed rasters by its bytes. On success, `mime` is the type detected
 * from the bytes, the one to store. jahia-store's ForgeMediaMimeListener applies the same rule server-side.
 */
export async function checkMediaFile(file: File): Promise<MediaCheck> {
  if (isSvgOrHtmlMedia(file.name, file.type) || (await containsSvgOrHtmlMarkup(file))) {
    return { ok: false, reason: "svgHtml" };
  }
  const mime = await sniffRasterMime(file);
  return mime ? { ok: true, mime } : { ok: false, reason: "notRaster" };
}

/** The message to show for a refused media file: SVG/HTML are named, other files get the generic message. */
export function mediaRejectionMessage(
  reason: MediaRejection,
  labels: Readonly<{ invalidType: string; svgHtmlRefused: string }>,
): string {
  return reason === "svgHtml" ? labels.svgHtmlRefused : labels.invalidType;
}
