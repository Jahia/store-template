import { describe, it, expect } from "vitest";
import { sanitizeHtml } from "../src/components/forge/sanitizeHtml";

/**
 * The SSR sanitizer is the ONLY layer covering every write path to the public detail page, so its
 * security properties must not silently regress (SECURITY-571 blind review: highest-risk gap).
 */
describe("sanitizeHtml", () => {
  it("returns an empty string for empty/nullish input", () => {
    expect(sanitizeHtml("")).toBe("");
    expect(sanitizeHtml(null)).toBe("");
    expect(sanitizeHtml(undefined)).toBe("");
  });

  it("strips <script> tags and their content", () => {
    const out = sanitizeHtml('<p>ok</p><script>alert(1)</script>');
    expect(out).not.toContain("<script");
    expect(out).not.toContain("alert(1)");
    expect(out).toContain("<p>ok</p>");
  });

  it("drops event-handler attributes", () => {
    const out = sanitizeHtml('<img src="x" onerror="alert(1)">');
    expect(out).not.toContain("onerror");
    expect(out).not.toContain("alert(1)");
  });

  it("removes javascript: URLs from href", () => {
    const out = sanitizeHtml('<a href="javascript:alert(1)">x</a>');
    expect(out).not.toContain("javascript:");
  });

  it("keeps the CKEditor 5 output allowlist (figure, figcaption, table cells)", () => {
    const out = sanitizeHtml(
      '<figure class="image"><img src="/a.png" alt="a"><figcaption>cap</figcaption></figure>' +
        '<table><tr><td colspan="2">c</td></tr></table>',
    );
    expect(out).toContain("<figure");
    expect(out).toContain("<figcaption>cap</figcaption>");
    expect(out).toContain("colspan");
  });

  it("strips <video>/<audio> (deliberately removed from the allowlist — unfiltered src)", () => {
    const out = sanitizeHtml('<video src="javascript:bad"></video><audio src="x"></audio>');
    expect(out).not.toContain("<video");
    expect(out).not.toContain("<audio");
  });
});
