import { useEffect, useState } from "react";
import styles from "~/components/forge/upload.module.css";

interface GitRepositoryLabels {
  urlLabel: string;
  submit: string;
  submitting: string;
  missingUrl: string;
  error: string;
}

interface GitRepositoryFormProps {
  /** Render-servlet URL of the registerGitModule action on modules-repository. */
  actionUrl: string;
  /** Where to send the user once the repository is registered (the My modules page). */
  backUrl: string;
  /** Translated labels, computed server-side and passed in (survive hydration). */
  labels: GitRepositoryLabels;
}

/**
 * POST a form-encoded body via XMLHttpRequest, so Jahia's CSRF guard attaches the per-page
 * OWASP-CSRFTOKEN header: the guard patches XHR, not fetch nor a plain <form> post. The
 * same reason the upload form posts via XHR.
 */
function postForm(url: string, data: URLSearchParams): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url, true);
    xhr.withCredentials = true;
    xhr.setRequestHeader("Accept", "application/json");
    xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
    xhr.onload = () => resolve({ status: xhr.status, body: xhr.responseText });
    xhr.onerror = () => reject(new Error("Network error"));
    xhr.send(data.toString());
  });
}

/**
 * The action reports a FAILURE as HTTP 200 with `{error}` and a success as `{module, path}`,
 * so the status alone says nothing: read `error` first. The message is server text, capped.
 */
function parseResult(body: string): { error?: string; module?: string } {
  try {
    const parsed: unknown = JSON.parse(body);
    if (parsed !== null && typeof parsed === "object") {
      const o = parsed as Record<string, unknown>;
      const out: { error?: string; module?: string } = {};
      if (typeof o.error === "string" && o.error.length > 0 && o.error.length <= 400) out.error = o.error;
      if (typeof o.module === "string") out.module = o.module;
      return out;
    }
  } catch {
    // non-JSON body: opaque
  }
  return {};
}

/**
 * "Register a git repository" form on the My modules page, client island.
 *
 * A store developer pastes the HTTPS URL of a repository that holds a STORE.md; the store
 * reads it and lists it as a git-backed module, read-only, with one version per tag. The
 * page reloads on success so the new module shows in the list below.
 */
export default function GitRepositoryForm({ actionUrl, backUrl, labels }: Readonly<GitRepositoryFormProps>) {
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [message, setMessage] = useState("");
  const [url, setUrl] = useState("");
  // Hydration-ready signal (mirrors FileUploadForm): SSR omits it, set after mount.
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  const handleSubmit = async () => {
    const value = url.trim();
    if (!/^https?:\/\/\S+$/.test(value)) {
      setStatus("error");
      setMessage(labels.missingUrl);
      return;
    }
    setStatus("submitting");
    setMessage("");
    try {
      const data = new URLSearchParams();
      data.set("gitUrl", value);
      const res = await postForm(actionUrl, data);
      const result = parseResult(res.body);
      if (result.error) {
        setStatus("error");
        setMessage(result.error);
        return;
      }
      if (res.status >= 200 && res.status < 300 && result.module) {
        globalThis.location.assign(backUrl);
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
    <form
      className={styles.upload}
      data-git-register-ready={ready ? "true" : undefined}
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit();
      }}
    >
      {status === "error" && (
        <div className={styles.error} role="alert">
          {message}
        </div>
      )}
      <div className={styles.field}>
        <label htmlFor="git-repository-url">{labels.urlLabel}</label>
        <input
          id="git-repository-url"
          type="url"
          name="gitUrl"
          inputMode="url"
          placeholder="https://github.com/org/my-module.git"
          size={60}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
      </div>
      <button type="submit" className={styles.btn} disabled={status === "submitting"}>
        {status === "submitting" ? labels.submitting : labels.submit}
      </button>
    </form>
  );
}
