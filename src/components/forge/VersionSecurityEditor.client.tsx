import { useEffect, useState } from "react";
import clsx from "clsx";
import styles from "./editor.module.css";
import { gqlRequest } from "~/lib/graphql";
import {
  SECURITY_SEVERITIES,
  isSeverity,
  parseReferences,
  securityMutation,
  securityPropertyChanges,
  type VersionSecurity,
} from "./versionSecurity";

export interface SecurityEditorLabels {
  edit: string;
  legend: string;
  flag: string;
  severity: string;
  severityNone: string;
  severities: Record<string, string>;
  references: string;
  referencesHelp: string;
  referencesInvalid: string;
  note: string;
  save: string;
  saving: string;
  cancel: string;
  error: string;
}

interface VersionSecurityEditorProps {
  /** JCR path of the version node. */
  path: string;
  /** GraphQL workspace to mutate - matches the workspace the page is rendered in. */
  workspace: "EDIT" | "LIVE";
  /** What the version holds now (server-rendered). */
  value: VersionSecurity;
  labels: SecurityEditorLabels;
}

/**
 * Owner-only editor for a version's security information: "contains security fixes", a severity,
 * JSA/CVE/GHSA references and a short note. jahia-store publishes it in securityUpdates.json so that Jahia
 * instances can warn their administrators, labelled as reported by the module owner.
 */
export default function VersionSecurityEditor({
  path,
  workspace,
  value,
  labels,
}: Readonly<VersionSecurityEditorProps>) {
  const [open, setOpen] = useState(false);
  const [flagged, setFlagged] = useState(value.flagged);
  const [severity, setSeverity] = useState<string>(value.severity);
  const [referencesText, setReferencesText] = useState(value.references.join(", "));
  const [note, setNote] = useState(value.note);
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  const idBase = `security-${path.replaceAll(/\W+/g, "-")}`;
  const { valid: references, invalid } = parseReferences(referencesText);
  const referencesInvalid = flagged && invalid.length > 0;

  const reset = () => {
    setFlagged(value.flagged);
    setSeverity(value.severity);
    setReferencesText(value.references.join(", "));
    setNote(value.note);
    setStatus("idle");
  };

  const save = async () => {
    if (referencesInvalid) return;
    setStatus("saving");
    try {
      const next: VersionSecurity = {
        flagged,
        severity: isSeverity(severity) ? severity : "",
        references,
        note,
      };
      const { query, variables } = securityMutation(workspace, path, securityPropertyChanges(next, value));
      await gqlRequest(query, variables);
      // The badge is server-rendered outside this island; reload so it reflects the saved value.
      globalThis.location.reload();
    } catch {
      setStatus("error");
    }
  };

  if (!open) {
    return (
      <div className={styles.changelogEditor} data-security-editor="" data-security-ready={ready ? "true" : undefined}>
        <button
          type="button"
          className={clsx(styles.btn, styles.linkBtn)}
          onClick={() => {
            reset();
            setOpen(true);
          }}
        >
          {labels.edit}
        </button>
      </div>
    );
  }

  return (
    <div className={styles.changelogEditor} data-security-editor="" data-security-ready={ready ? "true" : undefined}>
      <fieldset className={styles.securityForm}>
        <legend className={styles.fieldLabel}>{labels.legend}</legend>
        {status === "error" && (
          <div className={styles.error} role="alert">
            {labels.error}
          </div>
        )}
        <label className={styles.check} htmlFor={`${idBase}-flag`}>
          <input
            id={`${idBase}-flag`}
            type="checkbox"
            checked={flagged}
            onChange={(e) => setFlagged(e.target.checked)}
          />
          {labels.flag}
        </label>
        <div className={styles.field}>
          <label htmlFor={`${idBase}-severity`}>{labels.severity}</label>
          <select
            id={`${idBase}-severity`}
            className={styles.select}
            value={severity}
            disabled={!flagged}
            onChange={(e) => setSeverity(e.target.value)}
          >
            <option value="">{labels.severityNone}</option>
            {SECURITY_SEVERITIES.map((option) => (
              <option key={option} value={option}>
                {labels.severities[option] ?? option}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.field}>
          <label htmlFor={`${idBase}-references`}>{labels.references}</label>
          <input
            id={`${idBase}-references`}
            value={referencesText}
            disabled={!flagged}
            aria-invalid={referencesInvalid ? "true" : undefined}
            aria-describedby={`${idBase}-references-help${referencesInvalid ? ` ${idBase}-references-error` : ""}`}
            onChange={(e) => setReferencesText(e.target.value)}
          />
          <span id={`${idBase}-references-help`} className={styles.muted}>
            {labels.referencesHelp}
          </span>
          {referencesInvalid && (
            <span id={`${idBase}-references-error`} className={styles.error}>
              {labels.referencesInvalid} {invalid.join(", ")}
            </span>
          )}
        </div>
        <div className={styles.field}>
          <label htmlFor={`${idBase}-note`}>{labels.note}</label>
          <textarea
            id={`${idBase}-note`}
            rows={3}
            value={note}
            disabled={!flagged}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
        <div className={styles.actions}>
          <button
            type="button"
            className={clsx(styles.btn, styles.primary)}
            disabled={status === "saving" || referencesInvalid}
            onClick={save}
          >
            {status === "saving" ? labels.saving : labels.save}
          </button>
          <button
            type="button"
            className={clsx(styles.btn, styles.secondary)}
            disabled={status === "saving"}
            onClick={() => {
              reset();
              setOpen(false);
            }}
          >
            {labels.cancel}
          </button>
        </div>
      </fieldset>
    </div>
  );
}
