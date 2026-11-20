import { useEffect, useState } from "react";
import styles from "./upload.module.css";

export interface GitRefreshLabels {
  refresh: string;
  refreshing: string;
  refreshed: string;
  error: string;
}

interface GitRefreshButtonProps {
  /** Render-servlet URL of the refreshGitModule action on the module node. */
  actionUrl: string;
  /** Translated labels, computed server-side and passed in (survive hydration). */
  labels: GitRefreshLabels;
}

/**
 * POST via XMLHttpRequest, so Jahia's CSRF guard attaches the per-page OWASP-CSRFTOKEN header:
 * the guard patches XHR, not fetch nor a plain <form> post. Same as the registration form.
 */
function post(url: string): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url, true);
    xhr.withCredentials = true;
    xhr.setRequestHeader("Accept", "application/json");
    xhr.onload = () => resolve({ status: xhr.status, body: xhr.responseText });
    xhr.onerror = () => reject(new Error("Network error"));
    xhr.send();
  });
}

/** The action answers `{error}` on a failure and `{module, versions}` on success, both HTTP 200. */
function parseResult(body: string): { error?: string; versions?: number } {
  try {
    const parsed: unknown = JSON.parse(body);
    if (parsed !== null && typeof parsed === "object") {
      const o = parsed as Record<string, unknown>;
      const out: { error?: string; versions?: number } = {};
      if (typeof o.error === "string" && o.error.length > 0 && o.error.length <= 400) out.error = o.error;
      if (typeof o.versions === "number") out.versions = o.versions;
      return out;
    }
  } catch {
    // non-JSON body: opaque
  }
  return {};
}

/**
 * "Refresh from git" button of a git-backed module, client island, shown to the developer who
 * registered the module and to store administrators. The store reads the repository again, now,
 * and the page reloads so the new reading shows. A reading that fails leaves the page as it is
 * and shows the reason the store gives.
 */
export default function GitRefreshButton({ actionUrl, labels }: Readonly<GitRefreshButtonProps>) {
  const [status, setStatus] = useState<"idle" | "refreshing" | "error">("idle");
  const [message, setMessage] = useState("");
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  const handleClick = async () => {
    setStatus("refreshing");
    setMessage("");
    try {
      const res = await post(actionUrl);
      const result = parseResult(res.body);
      if (result.error) {
        setStatus("error");
        setMessage(result.error);
        return;
      }
      if (res.status >= 200 && res.status < 300 && typeof result.versions === "number") {
        globalThis.location.reload();
        return;
      }
      setStatus("error");
      setMessage(labels.error);
    } catch {
      setStatus("error");
      setMessage(labels.error);
    }
  };

  return (
    <div data-git-refresh-ready={ready ? "true" : undefined}>
      <button
        type="button"
        className={styles.btnCompact}
        disabled={status === "refreshing"}
        onClick={handleClick}
        data-git-refresh=""
      >
        {status === "refreshing" ? labels.refreshing : labels.refresh}
      </button>
      {status === "error" && (
        <div className={styles.error} role="alert">
          {message}
        </div>
      )}
    </div>
  );
}
