/**
 * Owner-declared security information of a module version (jahia-store `jnt:forgeModuleVersion`
 * properties securityFix, securitySeverity, securityReferences, securityNote). jahia-store publishes it
 * in securityUpdates.json as `flaggedVersions`, which Jahia instances read to warn their administrators.
 *
 * Pure helpers: no JCR access, so the client island and the tests can import them.
 */

export const SECURITY_SEVERITIES = ["low", "medium", "high", "critical"] as const;
export type SecuritySeverity = (typeof SECURITY_SEVERITIES)[number];

/** Same pattern as the CND constraint on securityReferences: a JSA, CVE or GHSA identifier. */
const SECURITY_REFERENCE = /^(JSA-\d{4}-\d{4}|CVE-\d{4}-\d{4,}|GHSA(-[23456789cfghjmpqrvwx]{4}){3})$/;

export interface VersionSecurity {
  flagged: boolean;
  /** One of SECURITY_SEVERITIES, or "" when the owner gave none. */
  severity: SecuritySeverity | "";
  references: string[];
  note: string;
}

export type PropertyChange =
  | { name: string; op: "set"; value: string }
  | { name: string; op: "setValues"; values: string[] }
  | { name: string; op: "remove" };

export function isSeverity(value: string): value is SecuritySeverity {
  return (SECURITY_SEVERITIES as readonly string[]).includes(value);
}

/** Splits free text on commas and white space; returns the distinct valid references and the rest. */
export function parseReferences(input: string): { valid: string[]; invalid: string[] } {
  const tokens = Array.from(new Set(input.split(/[\s,]+/).filter(Boolean)));
  return {
    valid: tokens.filter((token) => SECURITY_REFERENCE.test(token)),
    invalid: tokens.filter((token) => !SECURITY_REFERENCE.test(token)),
  };
}

/**
 * The property writes that store `next` on the version node, given what it holds now (`previous`).
 * Turning the flag off removes every detail, so a stale severity or note can never be published with an
 * unflagged version. A field is removed only when it holds a value: deleting a missing property fails.
 */
export function securityPropertyChanges(
  next: Readonly<VersionSecurity>,
  previous: Readonly<VersionSecurity>,
): PropertyChange[] {
  const keep = next.flagged;
  const note = keep ? next.note.trim() : "";
  const severity = keep ? next.severity : "";
  const references = keep ? next.references : [];
  const changes: PropertyChange[] = [{ name: "securityFix", op: "set", value: String(next.flagged) }];
  const write = (name: string, present: boolean, wasPresent: boolean, change: PropertyChange): void => {
    if (present) changes.push(change);
    else if (wasPresent) changes.push({ name, op: "remove" });
  };
  write("securitySeverity", severity !== "", previous.severity !== "", {
    name: "securitySeverity",
    op: "set",
    value: severity,
  });
  write("securityReferences", references.length > 0, previous.references.length > 0, {
    name: "securityReferences",
    op: "setValues",
    values: [...references],
  });
  write("securityNote", note !== "", previous.note.trim() !== "", { name: "securityNote", op: "set", value: note });
  return changes;
}

const SECURITY_PROPERTIES = new Set(["securityFix", "securitySeverity", "securityReferences", "securityNote"]);

/**
 * One GraphQL mutation applying `changes` to the version at `path`, in the workspace the page is rendered
 * in. Property names come from a fixed allow-list and every value is a variable, never interpolated.
 */
export function securityMutation(
  workspace: "EDIT" | "LIVE",
  path: string,
  changes: readonly PropertyChange[],
): { query: string; variables: Record<string, unknown> } {
  const declarations = ["$path: String!"];
  const fields: string[] = [];
  const variables: Record<string, unknown> = { path };
  changes.forEach((change, i) => {
    if (!SECURITY_PROPERTIES.has(change.name)) {
      throw new Error(`Not a security property: ${change.name}`);
    }
    const field = `p${i}: mutateProperty(name: "${change.name}")`;
    if (change.op === "set") {
      declarations.push(`$v${i}: String!`);
      variables[`v${i}`] = change.value;
      fields.push(`${field} { setValue(value: $v${i}) }`);
    } else if (change.op === "setValues") {
      declarations.push(`$v${i}: [String!]!`);
      variables[`v${i}`] = change.values;
      fields.push(`${field} { setValues(values: $v${i}) }`);
    } else {
      fields.push(`${field} { delete }`);
    }
  });
  const query = `mutation SetVersionSecurity(${declarations.join(", ")}) {
    jcr(workspace: ${workspace}) { mutateNode(pathOrId: $path) {
      ${fields.join("\n      ")}
    } }
  }`;
  return { query, variables };
}
