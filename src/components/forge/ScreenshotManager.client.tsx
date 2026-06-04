import { useEffect, useState } from "react";
import styles from "./screenshots.module.css";
import { gqlRequest } from "~/lib/graphql";

interface Item {
  name: string;
  url: string;
}

export interface ScreenshotLabels {
  empty: string;
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
  items: Item[];
  /** Translated labels, computed server-side and passed in (survives hydration). */
  labels: ScreenshotLabels;
}

const DELETE_NODE = /* GraphQL */ `
  mutation DeleteNode($path: String!) {
    jcr { mutateNode(pathOrId: $path) { delete } }
  }
`;

const REORDER = /* GraphQL */ `
  mutation Reorder($path: String!, $names: [String]!) {
    jcr { mutateNode(pathOrId: $path) { reorderChildren(names: $names) } }
  }
`;

/**
 * Owner-facing screenshot manager: reorder (↑/↓) and delete the module's
 * screenshots via the generic jcr mutations (delete / reorderChildren), gated
 * by JCR ACLs. This replaces the legacy DeleteScreenshot / ReorderScreenshots
 * Java actions - no custom Java. Optimistic UI, reverting on error.
 *
 * Deletion is irreversible, so it requires an explicit inline confirmation
 * before deleting (mirrors VersionDeleteButton): the first click on the delete
 * control reveals Confirm/Cancel; the second click actually deletes.
 */
export default function ScreenshotManager({ path, items, labels }: Readonly<ScreenshotManagerProps>) {
  const [list, setList] = useState<Item[]>(items);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= list.length || busy) return;
    const prev = list;
    const next = list.slice();
    [next[i], next[j]] = [next[j], next[i]];
    setList(next);
    setBusy(true);
    setError(false);
    gqlRequest(REORDER, { path, names: next.map((it) => it.name) })
      .catch(() => {
        setList(prev);
        setError(true);
      })
      .finally(() => setBusy(false));
  };

  const remove = (item: Item) => {
    if (busy) return;
    const prev = list;
    setConfirming(null);
    setList(list.filter((x) => x.name !== item.name));
    setBusy(true);
    setError(false);
    gqlRequest(DELETE_NODE, { path: `${path}/${item.name}` })
      .catch(() => {
        setList(prev);
        setError(true);
      })
      .finally(() => setBusy(false));
  };

  if (list.length === 0) {
    return <p className={styles.empty}>{labels.empty}</p>;
  }

  return (
    <div className={styles.manager} data-screenshots-ready={ready ? "true" : undefined}>
      {error && (
        <div className={styles.error} role="alert">
          {labels.error}
        </div>
      )}
      <ul className={styles.thumbs}>
        {list.map((it, i) => (
          <li key={it.name} className={styles.thumb} data-screenshot-name={it.name}>
            <img src={it.url} alt="" loading="lazy" />
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
                    type="button"
                    className={styles.confirmDelete}
                    disabled={busy}
                    onClick={() => remove(it)}
                  >
                    {labels.confirm}
                  </button>
                  <button
                    type="button"
                    className={styles.confirmCancel}
                    disabled={busy}
                    onClick={() => setConfirming(null)}
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
    </div>
  );
}
