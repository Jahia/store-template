import { useEffect, useState } from "react";
import clsx from "clsx";
import styles from "./editor.module.css";
import { gqlRequest } from "~/lib/graphql";

/** Editable fields of a forge module/package (all set via the jcr setValue mutation). */
export interface EditableValues {
  "jcr:title": string;
  description: string;
  howToInstall: string;
  FAQ: string;
  license: string;
  authorEmail: string;
  authorURL: string;
  codeRepository: string;
}

interface Labels {
  edit: string;
  save: string;
  saving: string;
  cancel: string;
  saved: string;
  error: string;
  title: string;
  description: string;
  howToInstall: string;
  faq: string;
  license: string;
  authorEmail: string;
  authorURL: string;
  codeRepository: string;
}

interface ModuleEditorProps {
  path: string;
  language: string;
  values: EditableValues;
  labels: Labels;
}

const SET_PROPERTY = /* GraphQL */ `
  mutation SetProperty($path: String!, $name: String!, $value: String!, $language: String!) {
    jcr {
      mutateNode(pathOrId: $path) {
        mutateProperty(name: $name) {
          setValue(value: $value, language: $language)
        }
      }
    }
  }
`;

// Order matters only for the form layout; the keys map 1:1 to JCR properties.
const FIELDS: { key: keyof EditableValues; labelKey: keyof Labels; multiline?: boolean }[] = [
  { key: "jcr:title", labelKey: "title" },
  { key: "description", labelKey: "description", multiline: true },
  { key: "howToInstall", labelKey: "howToInstall", multiline: true },
  { key: "FAQ", labelKey: "faq", multiline: true },
  { key: "license", labelKey: "license", multiline: true },
  { key: "authorEmail", labelKey: "authorEmail" },
  { key: "authorURL", labelKey: "authorURL" },
  { key: "codeRepository", labelKey: "codeRepository" },
];

/**
 * In-site editor for a module's metadata — the React replacement for the legacy
 * detailv3-edit JSP. Visible only to users with jcr:write (the server gates
 * rendering). Saves each changed field via the generic jcr setValue mutation
 * (session-authenticated; JCR ACLs apply), then reloads to show the result.
 *
 * Richtext fields use plain textareas for now (raw value); a rich-text editor
 * island is a later refinement.
 */
export default function ModuleEditor({ path, language, values, labels }: ModuleEditorProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<EditableValues>(values);
  // Baseline of last-saved values, so re-edits only push genuinely changed fields.
  const [baseline, setBaseline] = useState<EditableValues>(values);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  // Hydration-ready signal: SSR/initial render omit it; set after mount so
  // callers (and tests) can wait until the click handler is attached.
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  const update = (key: keyof EditableValues, value: string) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const handleSave = async () => {
    setStatus("saving");
    try {
      const changed = FIELDS.filter((f) => draft[f.key] !== baseline[f.key]);
      for (const f of changed) {
        await gqlRequest(SET_PROPERTY, {
          path,
          name: f.key,
          value: draft[f.key] ?? "",
          language,
        });
      }
      // Deterministic success state (no full-page reload, which races async
      // navigation). The server-rendered detail above reflects the change on
      // the next page load.
      setBaseline(draft);
      setStatus("saved");
      setOpen(false);
    } catch (err) {
      console.error("Failed to save module:", err);
      setStatus("error");
    }
  };

  return (
    <div className={styles.editor} data-editor-ready={ready ? "true" : undefined}>
      {!open && (
        <div className={styles.bar}>
          <button type="button" className={clsx(styles.btn, styles.primary)} onClick={() => setOpen(true)}>
            {labels.edit}
          </button>
          {status === "saved" && <span className={styles.saved} role="status">{labels.saved}</span>}
        </div>
      )}
      {open && (
        <form
          className={styles.form}
          onSubmit={(e) => {
            e.preventDefault();
            handleSave();
          }}
        >
          {status === "error" && (
            <div className={styles.error} role="alert">
              {labels.error}
            </div>
          )}
          {FIELDS.map((f) => {
            const fieldId = `edit-${String(f.key).replace(/:/g, "-")}`;
            return (
              <div key={f.key} className={styles.field}>
                <label htmlFor={fieldId}>{labels[f.labelKey]}</label>
                {f.multiline ? (
                  <textarea
                    id={fieldId}
                    rows={4}
                    value={draft[f.key] ?? ""}
                    onChange={(e) => update(f.key, e.target.value)}
                  />
                ) : (
                  <input
                    id={fieldId}
                    value={draft[f.key] ?? ""}
                    onChange={(e) => update(f.key, e.target.value)}
                  />
                )}
              </div>
            );
          })}
          <div className={styles.actions}>
            <button
              type="submit"
              className={clsx(styles.btn, styles.primary)}
              disabled={status === "saving"}
            >
              {status === "saving" ? labels.saving : labels.save}
            </button>
            <button
              type="button"
              className={clsx(styles.btn, styles.secondary)}
              disabled={status === "saving"}
              onClick={() => {
                setDraft(values);
                setStatus("idle");
                setOpen(false);
              }}
            >
              {labels.cancel}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
