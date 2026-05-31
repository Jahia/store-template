import { useEffect, useRef, type ReactNode } from "react";
import styles from "./editor.module.css";

interface RichTextEditorProps {
  id: string;
  /** Initial HTML to seed the editable surface (stored, server-sanitized value). */
  value: string;
  ariaLabel: string;
  /** Called with the current HTML on every edit. */
  onChange: (html: string) => void;
}

interface ToolItem {
  label: string;
  /** Rendered glyph for the toolbar button. */
  glyph: ReactNode;
  run: () => void;
}

/**
 * Format with the (deprecated but universally supported) execCommand API. It is
 * the smallest dependency-free way to drive a contenteditable surface; the heavy
 * editor libraries would be pulled into the GraalVM SSR bundle (ssr.noExternal),
 * which is exactly the failure mode that ruled out Apollo. This component is
 * browser-only: every DOM call lives inside a handler/effect, so SSR never runs it.
 */
function exec(command: string, value?: string): void {
  try {
    document.execCommand(command, false, value);
  } catch {
    // execCommand is best-effort; ignore environments that reject a command.
  }
}

/**
 * Minimal rich-text editor for the module metadata form's richtext fields
 * (description, how-to-install, FAQ, license). Outputs HTML, which is sanitized
 * with DOMPurify before it is persisted (see ModuleEditor). Replaces the plain
 * textareas the fields used previously.
 */
export default function RichTextEditor({ id, value, ariaLabel, onChange }: RichTextEditorProps) {
  const ref = useRef<HTMLDivElement>(null);

  // Seed the surface once from the stored HTML. We intentionally do NOT bind
  // innerHTML to `value` on every render — that resets the caret to the start on
  // each keystroke. After mount the contenteditable owns its own DOM and we only
  // read from it via onChange.
  useEffect(() => {
    const el = ref.current;
    if (el && el.innerHTML !== (value ?? "")) {
      el.innerHTML = value ?? "";
    }
    // Mount-only: re-seeding on value changes would fight the user's caret.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const emit = (): void => {
    if (ref.current) onChange(ref.current.innerHTML);
  };

  const apply = (fn: () => void): void => {
    ref.current?.focus();
    fn();
    emit();
  };

  const insertLink = (): void => {
    const url = window.prompt("Link URL", "https://");
    // Only allow safe schemes — never javascript:/data: — even though we also
    // sanitize on save.
    if (url && /^(https?:|mailto:)/i.test(url.trim())) {
      exec("createLink", url.trim());
    }
  };

  const tools: ToolItem[] = [
    { label: "Bold", glyph: <b>B</b>, run: () => exec("bold") },
    { label: "Italic", glyph: <i>I</i>, run: () => exec("italic") },
    { label: "Heading", glyph: "H2", run: () => exec("formatBlock", "<h2>") },
    { label: "Subheading", glyph: "H3", run: () => exec("formatBlock", "<h3>") },
    { label: "Paragraph", glyph: "¶", run: () => exec("formatBlock", "<p>") },
    { label: "Bulleted list", glyph: "• —", run: () => exec("insertUnorderedList") },
    { label: "Numbered list", glyph: "1.", run: () => exec("insertOrderedList") },
    { label: "Link", glyph: "🔗", run: insertLink },
    {
      label: "Clear formatting",
      glyph: "✕",
      run: () => {
        exec("removeFormat");
        exec("unlink");
      },
    },
  ];

  return (
    <div className={styles.rte}>
      <div className={styles.rteToolbar} role="toolbar" aria-label={`${ariaLabel} formatting`}>
        {tools.map((tool) => (
          <button
            key={tool.label}
            type="button"
            className={styles.rteBtn}
            title={tool.label}
            aria-label={tool.label}
            // Keep the editor selection while clicking a toolbar button.
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => apply(tool.run)}
          >
            {tool.glyph}
          </button>
        ))}
      </div>
      <div
        id={id}
        ref={ref}
        className={styles.rteSurface}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label={ariaLabel}
        onInput={emit}
        onBlur={emit}
      />
    </div>
  );
}
