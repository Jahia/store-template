import { useEffect, useState } from "react";
import clsx from "clsx";
import styles from "./editor.module.css";
import { gqlRequest } from "~/lib/graphql";
import RichTextEditor from "./RichTextEditor";

/**
 * Sanitize richtext HTML before it is persisted, so a stored value can never
 * carry script / event-handler / javascript: payloads into the detail page
 * (which renders these fields with dangerouslySetInnerHTML). DOMPurify is the
 * vetted sanitizer required by the security rules; it is imported dynamically so
 * it stays out of the GraalVM SSR bundle and only loads in the browser on save.
 */
async function sanitizeHtml(html: string): Promise<string> {
  const { default: DOMPurify } = await import("dompurify");
  return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
}

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
// `richtext` fields are the JCR richtext properties (see definitions.cnd) and use
// the RichTextEditor; the rest are single-line inputs.
const FIELDS: { key: keyof EditableValues; labelKey: keyof Labels; richtext?: boolean }[] = [
  { key: "jcr:title", labelKey: "title" },
  { key: "description", labelKey: "description", richtext: true },
  { key: "howToInstall", labelKey: "howToInstall", richtext: true },
  { key: "FAQ", labelKey: "faq", richtext: true },
  { key: "license", labelKey: "license", richtext: true },
  { key: "authorEmail", labelKey: "authorEmail" },
  { key: "authorURL", labelKey: "authorURL" },
  { key: "codeRepository", labelKey: "codeRepository" },
];

/**
 * In-site editor for a module's metadata — the React replacement for the legacy
 * detailv3-edit JSP. Visible only to users with jcr:write (the server gates
 * rendering). Saves each changed field via the generic jcr setValue mutation
 * (session-authenticated; JCR ACLs apply), then shows a deterministic "Saved"
 * state (the SSR detail reflects the change on next load).
 *
 * Richtext fields (description, how-to-install, FAQ, license) use the
 * RichTextEditor; their HTML is sanitized with DOMPurify before persisting.
 */
export default function ModuleEditor({ path, language, values, labels }: Readonly<ModuleEditorProps>) {
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
        const raw = draft[f.key] ?? "";
        const value = f.richtext ? await sanitizeHtml(raw) : raw;
        await gqlRequest(SET_PROPERTY, {
          path,
          name: f.key,
          value,
          language,
        });
      }
      // Deterministic success state (no full-page reload, which races async
      // navigation). The server-rendered detail above reflects the change on
      // the next page load.
      setBaseline(draft);
      setStatus("saved");
      setOpen(false);
    } catch {
      // Surfaced to the user via the error state below; no console logging in production.
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
          {status === "saved" && <output className={styles.saved}>{labels.saved}</output>}
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
            const fieldId = `edit-${String(f.key).replaceAll(":", "-")}`;
            return (
              <div key={f.key} className={styles.field}>
                <label htmlFor={fieldId}>{labels[f.labelKey]}</label>
                {f.richtext ? (
                  <RichTextEditor
                    id={fieldId}
                    value={draft[f.key] ?? ""}
                    ariaLabel={labels[f.labelKey]}
                    onChange={(html) => update(f.key, html)}
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
