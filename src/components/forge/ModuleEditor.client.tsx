import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import clsx from "clsx";
import styles from "./editor.module.css";
import { gqlRequest } from "~/lib/graphql";
import CKEditorField from "./CKEditorField";
import IconUpload, { type IconLabels } from "./IconUpload";

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
  tabGeneral: string;
  tabDescription: string;
  tabInstall: string;
  tabLicense: string;
  tabAuthor: string;
  tablist: string;
  icon: IconLabels;
}

interface ModuleEditorProps {
  path: string;
  /** GraphQL workspace to mutate — matches the workspace the page is rendered in. */
  workspace: "EDIT" | "LIVE";
  language: string;
  /** Current icon URL (server-rendered), or null. */
  iconUrl: string | null;
  values: EditableValues;
  labels: Labels;
}

/**
 * `ws` is a server-computed enum ("EDIT" | "LIVE"), never user input, so
 * interpolating it is safe. The write MUST target the workspace the page is
 * rendered in: forge content authored on the live site lives in LIVE, so a
 * default-workspace (EDIT) write would not find the node.
 */
const setPropertyMutation = (ws: "EDIT" | "LIVE") => /* GraphQL */ `
  mutation SetProperty($path: String!, $name: String!, $value: String!, $language: String!) {
    jcr(workspace: ${ws}) {
      mutateNode(pathOrId: $path) {
        mutateProperty(name: $name) {
          setValue(value: $value, language: $language)
        }
      }
    }
  }
`;

interface FieldDef {
  key: keyof EditableValues;
  labelKey: keyof Labels;
  /** richtext fields use CKEditorField + DOMPurify; the rest are single-line inputs. */
  richtext?: boolean;
}

interface TabDef {
  id: string;
  labelKey: keyof Labels;
  fields: FieldDef[];
  /** General tab also hosts the icon upload. */
  withIcon?: boolean;
}

// Tabs group the fields by concern — the better ergonomy that the legacy edit
// screen had. The field keys map 1:1 to JCR properties.
const TABS: TabDef[] = [
  { id: "general", labelKey: "tabGeneral", withIcon: true, fields: [{ key: "jcr:title", labelKey: "title" }] },
  { id: "description", labelKey: "tabDescription", fields: [{ key: "description", labelKey: "description", richtext: true }] },
  {
    id: "install",
    labelKey: "tabInstall",
    fields: [
      { key: "howToInstall", labelKey: "howToInstall", richtext: true },
      { key: "FAQ", labelKey: "faq", richtext: true },
    ],
  },
  { id: "license", labelKey: "tabLicense", fields: [{ key: "license", labelKey: "license", richtext: true }] },
  {
    id: "author",
    labelKey: "tabAuthor",
    fields: [
      { key: "authorEmail", labelKey: "authorEmail" },
      { key: "authorURL", labelKey: "authorURL" },
      { key: "codeRepository", labelKey: "codeRepository" },
    ],
  },
];

const ALL_FIELDS: FieldDef[] = TABS.flatMap((t) => t.fields);

/**
 * In-site editor for a module's metadata — the React replacement for the legacy
 * detailv3-edit JSP. Visible only to users with jcr:write (the server gates
 * rendering). Fields are grouped into accessible tabs; each changed field is
 * saved via the generic jcr setValue mutation (session-authenticated, JCR ACLs
 * apply), then a deterministic "Saved" state is shown.
 *
 * Richtext fields use CKEditor 5 from the deployed richtext-ckeditor5 module
 * (CKEditorField); their HTML is sanitized with DOMPurify before persisting.
 * The General tab also hosts the module icon upload.
 */
export default function ModuleEditor({
  path,
  workspace,
  language,
  iconUrl,
  values,
  labels,
}: Readonly<ModuleEditorProps>) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<EditableValues>(values);
  // Baseline of last-saved values, so re-edits only push genuinely changed fields.
  const [baseline, setBaseline] = useState<EditableValues>(values);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [active, setActive] = useState<string>(TABS[0].id);
  // Hydration-ready signal: SSR/initial render omit it; set after mount so
  // callers (and tests) can wait until the click handler is attached.
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const update = (key: keyof EditableValues, value: string) =>
    setDraft((d) => ({ ...d, [key]: value }));

  // Tablist keyboard support (WAI-ARIA): arrows move + select, Home/End jump.
  const onTabKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = TABS.length - 1;
    let next: number | null = null;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = index === last ? 0 : index + 1;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = index === 0 ? last : index - 1;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = last;
    if (next === null) return;
    e.preventDefault();
    const id = TABS[next].id;
    setActive(id);
    tabRefs.current[id]?.focus();
  };

  const handleSave = async () => {
    setStatus("saving");
    try {
      const changed = ALL_FIELDS.filter((f) => draft[f.key] !== baseline[f.key]);
      for (const f of changed) {
        const raw = draft[f.key] ?? "";
        const value = f.richtext ? await sanitizeHtml(raw) : raw;
        await gqlRequest(setPropertyMutation(workspace), { path, name: f.key, value, language });
      }
      // Deterministic success state (no full-page reload, which races async
      // navigation). The server-rendered detail reflects the change on next load.
      setBaseline(draft);
      setStatus("saved");
      setOpen(false);
    } catch {
      // Surfaced via the error state below; no console logging in production.
      setStatus("error");
    }
  };

  const activeTab = TABS.find((t) => t.id === active) ?? TABS[0];

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

          <div className={styles.tablist} role="tablist" aria-label={labels.tablist}>
            {TABS.map((tab, index) => {
              const selected = tab.id === active;
              return (
                <button
                  key={tab.id}
                  ref={(el) => {
                    tabRefs.current[tab.id] = el;
                  }}
                  type="button"
                  role="tab"
                  id={`tab-${tab.id}`}
                  aria-selected={selected}
                  aria-controls={`panel-${tab.id}`}
                  tabIndex={selected ? 0 : -1}
                  className={clsx(styles.tab, selected && styles.tabActive)}
                  onClick={() => setActive(tab.id)}
                  onKeyDown={(e) => onTabKeyDown(e, index)}
                >
                  {labels[tab.labelKey] as string}
                </button>
              );
            })}
          </div>

          <div
            role="tabpanel"
            id={`panel-${activeTab.id}`}
            aria-labelledby={`tab-${activeTab.id}`}
            className={styles.panel}
          >
            {activeTab.withIcon && (
              <IconUpload path={path} workspace={workspace} iconUrl={iconUrl} labels={labels.icon} />
            )}
            {activeTab.fields.map((f) => {
              const fieldId = `edit-${String(f.key).replaceAll(":", "-")}`;
              return (
                <div key={f.key} className={styles.field}>
                  <label htmlFor={fieldId}>{labels[f.labelKey] as string}</label>
                  {f.richtext ? (
                    <CKEditorField
                      id={fieldId}
                      value={draft[f.key] ?? ""}
                      ariaLabel={labels[f.labelKey] as string}
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
          </div>

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
                setActive(TABS[0].id);
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
