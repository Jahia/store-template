import { useEffect, useRef, useState } from "react";
import styles from "./screenshots.module.css";
import { gqlRequest, gqlUpload } from "~/lib/graphql";
import { isTrustedRasterImage } from "./imageSniff";

interface Item {
  name: string;
  url: string;
}

export interface ScreenshotLabels {
  empty: string;
  add: string;
  uploading: string;
  tooLarge: string;
  invalidType: string;
  moveUp: string;
  moveDown: string;
  delete: string;
  confirmPrompt: string;
  confirm: string;
  cancel: string;
  error: string;
}

interface ScreenshotManagerProps {
  /** Path of the screenshots node (parent of the image files). */
  path: string;
  /** GraphQL workspace to mutate - matches the workspace the page is rendered in. */
  workspace: "EDIT" | "LIVE";
  items: Item[];
  /** Translated labels, computed server-side and passed in (survives hydration). */
  labels: ScreenshotLabels;
}

/** Raster image types only (SVG can carry scripts when served inline). */
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"] as const;
/** Screenshots are page-width images; cap the multipart part at a sane size. */
const MAX_BYTES = 5 * 1024 * 1024;

/** `ws` is a server-computed enum, never user input - safe to interpolate. */
const deleteNodeMutation = (ws: "EDIT" | "LIVE") => /* GraphQL */ `
  mutation DeleteNode($path: String!) {
    jcr(workspace: ${ws}) { mutateNode(pathOrId: $path) { delete } }
  }
`;

const reorderMutation = (ws: "EDIT" | "LIVE") => /* GraphQL */ `
  mutation Reorder($path: String!, $names: [String]!) {
    jcr(workspace: ${ws}) { mutateNode(pathOrId: $path) { reorderChildren(names: $names) } }
  }
`;

/** Append an uploaded image as a jnt:file under the screenshots list (mirrors IconUpload). */
const addScreenshotMutation = (ws: "EDIT" | "LIVE") => /* GraphQL */ `
  mutation AddScreenshot($parent: String!, $name: String!, $file: String!, $mime: String!) {
    jcr(workspace: ${ws}) {
      mutateNode(pathOrId: $parent) {
        addChild(name: $name, primaryNodeType: "jnt:file") {
          addChild(name: "jcr:content", primaryNodeType: "jnt:resource") {
            data: mutateProperty(name: "jcr:data") { setValue(type: BINARY, value: $file) }
            mime: mutateProperty(name: "jcr:mimeType") { setValue(value: $mime) }
          }
        }
      }
    }
  }
`;

/** JCR-safe child name derived from the picked file name (mirrors IconUpload). */
function safeFileName(name: string): string {
  const cleaned = name.trim().replaceAll(/[^\w.-]+/g, "_").replace(/^_+/, "");
  return cleaned || "screenshot.png";
}

/**
 * Only render thumbnails whose URL we trust: a server-rendered http(s)/relative path, or a
 * `blob:` object URL minted by our own URL.createObjectURL below. Anything else is dropped, so
 * a stray scheme can never reach the <img src> (defence-in-depth for js/xss-through-dom).
 */
function safeImageSrc(url: string): string {
  return /^(?:https?:\/\/|\/|blob:)/i.test(url) ? url : "";
}

/**
 * Owner-facing screenshot manager (rendered in the editor's Media tab): upload new
 * screenshots, reorder (↑/↓) and delete existing ones via the generic jcr
 * mutations (gated by JCR ACLs - no custom Java). Upload/reorder/delete are
 * optimistic, reverting on error. The upload control is always shown so the first
 * screenshot can be added to a module that has none.
 *
 * Deletion is irreversible, so it requires an explicit inline confirmation before
 * deleting (mirrors VersionDeleteButton): the first click on the delete control
 * reveals Confirm/Cancel; the second click actually deletes.
 */
export default function ScreenshotManager({
  path,
  workspace,
  items,
  labels,
}: Readonly<ScreenshotManagerProps>) {
  const inputRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const [list, setList] = useState<Item[]>(items);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [message, setMessage] = useState("");
  const [confirming, setConfirming] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  // Move focus to the Confirm button when the inline delete prompt appears, so a keyboard user
  // can act on it instead of being dropped onto <body> when the delete trigger unmounts.
  useEffect(() => {
    if (confirming) confirmRef.current?.focus();
  }, [confirming]);

  const fail = (msg: string) => {
    setError(true);
    setMessage(msg);
  };

  const upload = async (file: File) => {
    if (busy) return;
    if (file.size > MAX_BYTES) return fail(labels.tooLarge);
    // Verify the actual bytes are a raster image, not just the (spoofable) File.type — the server
    // re-validates authoritatively (SECURITY-571 #28), this is the in-browser guard.
    if (!(await isTrustedRasterImage(file))) return fail(labels.invalidType);
    setBusy(true);
    setError(false);
    setMessage("");
    const name = safeFileName(file.name);
    try {
      await gqlUpload(addScreenshotMutation(workspace), { parent: path, name, mime: file.type }, file);
      // Optimistic: show the new thumbnail from a local object URL (the real,
      // server-rendered URL arrives on the next page load).
      setList((prev) => [...prev, { name, url: URL.createObjectURL(file) }]);
      if (inputRef.current) inputRef.current.value = "";
    } catch {
      fail(labels.error);
    } finally {
      setBusy(false);
    }
  };

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= list.length || busy) return;
    const prev = list;
    const next = list.slice();
    [next[i], next[j]] = [next[j], next[i]];
    setList(next);
    setBusy(true);
    setError(false);
    gqlRequest(reorderMutation(workspace), { path, names: next.map((it) => it.name) })
      .catch(() => {
        setList(prev);
        fail(labels.error);
      })
      .finally(() => setBusy(false));
  };

  const remove = (item: Item) => {
    if (busy) return;
    const prev = list;
    setConfirming(null);
    setList(list.filter((x) => x.name !== item.name));
    // The deleted row (and its focused button) unmounts; move focus to the upload control
    // rather than letting it fall to <body> (WCAG 2.4.3).
    requestAnimationFrame(() => inputRef.current?.focus());
    setBusy(true);
    setError(false);
    gqlRequest(deleteNodeMutation(workspace), { path: `${path}/${item.name}` })
      .catch(() => {
        setList(prev);
        fail(labels.error);
      })
      .finally(() => setBusy(false));
  };

  return (
    <div className={styles.manager} data-screenshots-ready={ready ? "true" : undefined}>
      {error && (
        <div className={styles.error} role="alert">
          {message}
        </div>
      )}
      <div className={styles.uploadRow}>
        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED_TYPES.join(",")}
          aria-label={labels.add}
          data-screenshot-input=""
          disabled={busy}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void upload(f);
          }}
        />
        {busy && <span className={styles.uploading}>{labels.uploading}</span>}
      </div>
      {list.length === 0 ? (
        <p className={styles.empty}>{labels.empty}</p>
      ) : (
        <ul className={styles.thumbs}>
          {list.map((it, i) => (
            <li key={it.name} className={styles.thumb} data-screenshot-name={it.name}>
              <img src={safeImageSrc(it.url)} alt="" loading="lazy" />
              <div className={styles.controls}>
                <button
                  type="button"
                  disabled={busy || i === 0}
                  aria-label={labels.moveUp}
                  onClick={() => move(i, -1)}
                >
                  ↑
                </button>
                <button
                  type="button"
                  disabled={busy || i === list.length - 1}
                  aria-label={labels.moveDown}
                  onClick={() => move(i, 1)}
                >
                  ↓
                </button>
                {confirming === it.name ? (
                  <span className={styles.confirm}>
                    <button
                      ref={confirmRef}
                      type="button"
                      className={styles.confirmDelete}
                      disabled={busy}
                      onClick={() => remove(it)}
                      aria-label={`${labels.confirm}: ${it.name}`}
                    >
                      {labels.confirm}
                    </button>
                    <button
                      type="button"
                      className={styles.confirmCancel}
                      disabled={busy}
                      onClick={() => setConfirming(null)}
                      aria-label={`${labels.cancel}: ${it.name}`}
                    >
                      {labels.cancel}
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    className={styles.delete}
                    disabled={busy}
                    aria-label={labels.delete}
                    onClick={() => setConfirming(it.name)}
                  >
                    ✕
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
