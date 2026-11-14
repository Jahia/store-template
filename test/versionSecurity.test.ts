import { describe, expect, it } from "vitest";
import {
  isSeverity,
  parseReferences,
  securityMutation,
  securityPropertyChanges,
} from "../src/components/forge/versionSecurity";

describe("parseReferences", () => {
  it("splits on commas, spaces and new lines and keeps the order", () => {
    expect(parseReferences("JSA-2026-0011, CVE-2026-1234\nGHSA-2c2c-3f3f-4g4g")).toEqual({
      valid: ["JSA-2026-0011", "CVE-2026-1234", "GHSA-2c2c-3f3f-4g4g"],
      invalid: [],
    });
  });

  it("accepts a JSA identifier with a numeric suffix, and refuses a malformed suffix", () => {
    expect(parseReferences("JSA-2026-0036.1066 JSA-2026-0036. JSA-2026-0036.10a")).toEqual({
      valid: ["JSA-2026-0036.1066"],
      invalid: ["JSA-2026-0036.", "JSA-2026-0036.10a"],
    });
  });

  it("drops duplicates and returns nothing for blank input", () => {
    expect(parseReferences(" JSA-2026-0011 JSA-2026-0011 ").valid).toEqual(["JSA-2026-0011"]);
    expect(parseReferences("   ")).toEqual({ valid: [], invalid: [] });
  });

  it("reports the values the store would refuse (same pattern as the CND constraint)", () => {
    expect(parseReferences("JSA-26-1 cve-2026-1234 GHSA-aaaa-bbbb-cccc CVE-2026-123").invalid).toEqual([
      "JSA-26-1",
      "cve-2026-1234",
      "GHSA-aaaa-bbbb-cccc",
      "CVE-2026-123",
    ]);
  });
});

describe("isSeverity", () => {
  it.each(["low", "medium", "high", "critical"])("accepts %s", (value) => {
    expect(isSeverity(value)).toBe(true);
  });

  it.each(["", "urgent", "HIGH"])("refuses %j", (value) => {
    expect(isSeverity(value)).toBe(false);
  });
});

describe("securityPropertyChanges", () => {
  const before = { flagged: true, severity: "high", references: ["CVE-2026-1234"], note: "old" } as const;
  const empty = { flagged: false, severity: "", references: [], note: "" } as const;

  it("writes every field of a flagged version", () => {
    expect(
      securityPropertyChanges(
        { flagged: true, severity: "high", references: ["JSA-2026-0011"], note: "  Fixes an XSS  " },
        empty,
      ),
    ).toEqual([
      { name: "securityFix", op: "set", value: "true" },
      { name: "securitySeverity", op: "set", value: "high" },
      { name: "securityReferences", op: "setValues", values: ["JSA-2026-0011"] },
      { name: "securityNote", op: "set", value: "Fixes an XSS" },
    ]);
  });

  it("removes the optional fields that were set and are now empty", () => {
    expect(securityPropertyChanges({ flagged: true, severity: "", references: [], note: " " }, before)).toEqual([
      { name: "securityFix", op: "set", value: "true" },
      { name: "securitySeverity", op: "remove" },
      { name: "securityReferences", op: "remove" },
      { name: "securityNote", op: "remove" },
    ]);
  });

  it("does not remove a field that did not exist (deleting a missing property is an error)", () => {
    expect(securityPropertyChanges({ flagged: true, severity: "", references: [], note: "" }, empty)).toEqual([
      { name: "securityFix", op: "set", value: "true" },
    ]);
  });

  it("clears every detail when the flag is turned off, so no stale severity is published", () => {
    expect(
      securityPropertyChanges({ flagged: false, severity: "high", references: ["CVE-2026-1234"], note: "x" }, before),
    ).toEqual([
      { name: "securityFix", op: "set", value: "false" },
      { name: "securitySeverity", op: "remove" },
      { name: "securityReferences", op: "remove" },
      { name: "securityNote", op: "remove" },
    ]);
  });
});

describe("securityMutation", () => {
  it("builds one aliased mutation, values as variables, in the page's workspace", () => {
    const { query, variables } = securityMutation(
      "LIVE",
      "/sites/store/contents/modules-repository/m/m-1.0.0",
      [
        { name: "securityFix", op: "set", value: "true" },
        { name: "securityReferences", op: "setValues", values: ["JSA-2026-0011"] },
        { name: "securityNote", op: "remove" },
      ],
    );

    expect(query.replaceAll(/\s+/g, " ")).toBe(
      "mutation SetVersionSecurity($path: String!, $v0: String!, $v1: [String!]!) { " +
        "jcr(workspace: LIVE) { mutateNode(pathOrId: $path) { " +
        'p0: mutateProperty(name: "securityFix") { setValue(value: $v0) } ' +
        'p1: mutateProperty(name: "securityReferences") { setValues(values: $v1) } ' +
        'p2: mutateProperty(name: "securityNote") { delete } ' +
        "} } }",
    );
    expect(variables).toEqual({
      path: "/sites/store/contents/modules-repository/m/m-1.0.0",
      v0: "true",
      v1: ["JSA-2026-0011"],
    });
  });

  it("refuses a property outside the four security properties", () => {
    expect(() => securityMutation("EDIT", "/p", [{ name: "published", op: "set", value: "true" }])).toThrow();
  });
});
