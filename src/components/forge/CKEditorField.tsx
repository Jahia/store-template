import { useEffect, useRef, useState } from "react";
import styles from "./ckeditor.module.css";
import { loadCKEditor, type CKEditorInstance } from "./loadCKEditor";

interface CKEditorFieldProps {
  id: string;
  /** Initial HTML to seed the editor (stored, server-sanitized value). */
  value: string;
  ariaLabel: string;
  /** Called with the current HTML on every edit. */
  onChange: (html: string) => void;
}

/**
 * Plugins (by name) and toolbar for the module store's richtext fields. We do NOT
 * import ckeditor5 — the classes are pulled from the runtime-loaded federated
 * namespace, so nothing CKEditor lands in store-template's own bundle. `Essentials`
 * brings undo/redo, typing and clipboard support.
 */
const PLUGIN_NAMES = [
  "Essentials",
  "Paragraph",
  "Heading",
  "Bold",
  "Italic",
  "Link",
  "List",
  "BlockQuote",
] as const;

const TOOLBAR = [
  "heading",
  "|",
  "bold",
  "italic",
  "link",
  "bulletedList",
  "numberedList",
  "blockQuote",
  "|",
  "undo",
  "redo",
];

type EditorState = "loading" | "ready" | "failed";

/**
 * Rich-text editor backed by CKEditor 5 from the deployed `richtext-ckeditor5`
 * module (loaded at runtime — see loadCKEditor). Replaces the previous
 * dependency-free execCommand editor so the store reuses the organisation's
 * standard editor build.
 *
 * Output HTML is still sanitized with DOMPurify before it is persisted (see the
 * islands that own the save). If the remote cannot be loaded the field degrades
 * to a plain textarea so editing — and accessibility — never breaks.
 */
export default function CKEditorField({ id, value, ariaLabel, onChange }: Readonly<CKEditorFieldProps>) {
  const holderRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<CKEditorInstance | null>(null);
  // Keep the latest onChange without re-running the mount-only effect.
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const [state, setState] = useState<EditorState>("loading");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const ns = await loadCKEditor();
        if (cancelled || !holderRef.current) return;
        const plugins = PLUGIN_NAMES.map((name) => ns[name]).filter(Boolean);
        const editor = await ns.ClassicEditor.create(holderRef.current, {
          // 'GPL' unlocks the open-source feature set we use (no premium plugins).
          licenseKey: "GPL",
          plugins,
          toolbar: TOOLBAR,
          initialData: value ?? "",
        });
        if (cancelled) {
          editor.destroy();
          return;
        }
        editorRef.current = editor;
        editor.model.document.on("change:data", () => onChangeRef.current(editor.getData()));
        setState("ready");
      } catch {
        // Surfaced via the textarea fallback below; no console logging in production.
        if (!cancelled) setState("failed");
      }
    })();
    return () => {
      cancelled = true;
      editorRef.current?.destroy();
      editorRef.current = null;
    };
    // Mount-only: the editor owns its DOM after creation; re-seeding from `value`
    // on every render would fight the user's caret.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (state === "failed") {
    return (
      <textarea
        id={id}
        className={styles.fallback}
        aria-label={ariaLabel}
        defaultValue={value}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }

  return (
    <div className={styles.wrap} data-ckeditor-state={state}>
      {/* ClassicEditor replaces this element with its toolbar + editable on mount. */}
      <div id={id} ref={holderRef} className={styles.holder} aria-label={ariaLabel} />
      {state === "loading" && <span className={styles.loading}>Loading editor…</span>}
    </div>
  );
}
