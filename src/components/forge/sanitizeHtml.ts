import { FilterXSS, getDefaultWhiteList } from "xss";

/**
 * Server-side HTML sanitizer for owner-authored richtext (CKEditor 5 output)
 * rendered via `dangerouslySetInnerHTML`.
 *
 * This is the ONLY layer that covers every write path: the in-site editor
 * sanitizes with DOMPurify on save, but a module owner (jcr:write) can write
 * arbitrary HTML straight through the Jahia GraphQL `mutateProperty` API, which
 * bypasses the editor. Since the detail page is public, that stored HTML would
 * otherwise execute for every visitor (stored XSS, SECURITY-571 B2). We sanitize
 * again at render so no unsanitized markup ever reaches the DOM.
 *
 * `xss` is used (not DOMPurify) because it is a pure-JS, allowlist-based
 * tokenizer with NO DOM dependency, so it runs in the GraalJS SSR engine where
 * DOMPurify (browser-only) cannot. The allowlist is the CKEditor 5 output set;
 * unknown tags are stripped, all `on*` handlers are dropped, and `href`/`src`
 * values resolving to non-http(s)/mailto schemes (javascript:, vbscript:, most
 * data:) are removed by the library's `safeAttrValue`.
 */

// Start from the library's safe default allowlist and narrow/extend it to the
// CKEditor 5 output set.
const whiteList = {
  ...getDefaultWhiteList(),
  // Links open in the same tab: no `target` (so no reverse-tabnabbing) and no `rel`.
  // The library's safeAttrValue still strips javascript:/data:/vbscript: from href.
  a: ["href", "title"],
  p: ["class"],
  span: ["class"],
  figure: ["class"],
  figcaption: [],
  img: ["src", "alt", "title", "width", "height", "class"],
  td: ["colspan", "rowspan"],
  th: ["colspan", "rowspan", "scope"],
  table: ["class"],
  // blockquote without `cite`: the library does not scheme-filter `cite`, and CKEditor
  // never emits it.
  blockquote: [],
};
// Drop tags whose URL attributes the library does not scheme-filter (poster/src) and
// that CKEditor 5 basic richtext never produces.
delete (whiteList as Record<string, unknown>).video;
delete (whiteList as Record<string, unknown>).audio;

const filter = new FilterXSS({
  whiteList,
  // Remove disallowed tags entirely rather than escaping them, and drop the
  // CONTENT of dangerous container tags so no script/style text survives.
  stripIgnoreTag: true,
  stripIgnoreTagBody: ["script", "style"],
});

/**
 * Sanitize a richtext HTML string for safe rendering. Returns "" for empty input
 * so callers can keep using truthiness checks before rendering the block.
 */
export function sanitizeHtml(html: string | null | undefined): string {
  if (!html) return "";
  return filter.process(html);
}
