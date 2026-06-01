import { useEffect, useState } from "react";
import clsx from "clsx";
import styles from "./editor.module.css";
import { gqlRequest } from "~/lib/graphql";
import CKEditorField from "./CKEditorField";

async function sanitizeHtml(html: string): Promise<string> {
  const { default: DOMPurify } = await import("dompurify");
  return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
}

export interface ChangelogLabels {
  edit: string;
  save: string;
  saving: string;
  cancel: string;
  saved: string;
  error: string;
  ariaLabel: string;
}

interface VersionChangelogEditorProps {
  /** JCR path of the version node. */
  path: string;
  /** GraphQL workspace to mutate — matches the workspace the page is rendered in. */
  workspace: "EDIT" | "LIVE";
  language: string;
  /** Current changelog HTML (server-rendered, sanitized). */
  value: string;
  labels: ChangelogLabels;
}

const setChangeLogMutation = (ws: "EDIT" | "LIVE") => /* GraphQL */ `
  mutation SetChangeLog($path: String!, $value: String!, $language: String!) {
    jcr(workspace: ${ws}) {
      mutateNode(pathOrId: $path) {
        mutateProperty(name: "changeLog") {
          setValue(value: $value, language: $language)
        }
      }
    }
  }
`;

/**
 * Owner-only editor for a single version's `changeLog` richtext. Mirrors the
 * ModuleEditor save flow (CKEditor 5 + DOMPurify on save, workspace- and
 * language-aware setValue) but for one field, rendered inside each version card.
 */
export default function VersionChangelogEditor({
  path,
  workspace,
  language,
  value,
  labels,
}: Readonly<VersionChangelogEditorProps>) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  const fieldId = `changelog-${path.replaceAll(/\W+/g, "-")}`;

  const save = async () => {
    setStatus("saving");
    try {
      const clean = await sanitizeHtml(draft ?? "");
      await gqlRequest(setChangeLogMutation(workspace), { path, value: clean, language });
      setStatus("saved");
      setOpen(false);
    } catch {
      setStatus("error");
    }
  };

  return (
    <div
      className={styles.changelogEditor}
      data-changelog-scope="version"
      data-changelog-ready={ready ? "true" : undefined}
    >
      {!open && (
        <>
          <button
            type="button"
            className={clsx(styles.btn, styles.linkBtn)}
            onClick={() => {
              setDraft(value);
              setStatus("idle");
              setOpen(true);
            }}
          >
            {labels.edit}
          </button>
          {status === "saved" && <output className={styles.saved}>{labels.saved}</output>}
        </>
      )}
      {open && (
        <div className={styles.changelogForm}>
          {status === "error" && (
            <div className={styles.error} role="alert">
              {labels.error}
            </div>
          )}
          <CKEditorField id={fieldId} value={draft ?? ""} ariaLabel={labels.ariaLabel} onChange={setDraft} />
          <div className={styles.actions}>
            <button
              type="button"
              className={clsx(styles.btn, styles.primary)}
              disabled={status === "saving"}
              onClick={save}
            >
              {status === "saving" ? labels.saving : labels.save}
            </button>
            <button
              type="button"
              className={clsx(styles.btn, styles.secondary)}
              disabled={status === "saving"}
              onClick={() => {
                setDraft(value);
                setStatus("idle");
                setOpen(false);
              }}
            >
              {labels.cancel}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
