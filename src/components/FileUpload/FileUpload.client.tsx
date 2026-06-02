import { useEffect, useRef, useState } from "react";
import styles from "~/components/forge/upload.module.css";

interface UploadLabels {
  fileLabel: string;
  submit: string;
  submitting: string;
  pickFile: string;
  error: string;
}

interface FileUploadFormProps {
  /** Render-servlet URL of the createEntryFromJar action on modules-repository. */
  actionUrl: string;
  /** Where to send the user after a successful upload if the action returns no module URL. */
  backUrl: string;
  /** Accepted file extensions for the native picker. */
  accept: string;
  /** Translated labels, computed server-side and passed in (survives hydration). */
  labels: UploadLabels;
}

/**
 * POST multipart form-data via XMLHttpRequest so Jahia's CSRF guard attaches the
 * per-page OWASP-CSRFTOKEN header. The guard monkey-patches XHR (not fetch, and
 * not plain full-page <form> posts), so a normal form submit fails intermittently
 * with "Request Token does not match Page Token". XHR is the project-wide pattern
 * for `.do` actions.
 *
 * Do NOT set Content-Type - the browser must add the multipart boundary itself.
 */
function postMultipart(url: string, data: FormData): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url, true);
    xhr.withCredentials = true;
    xhr.setRequestHeader("Accept", "application/json");
    xhr.onload = () => resolve({ status: xhr.status, body: xhr.responseText });
    xhr.onerror = () => reject(new Error("Network error"));
    xhr.send(data);
  });
}

/**
 * Narrow the action's JSON. createEntryFromJar reports FAILURES as HTTP 200 with
 * `{error}` (errorResult uses SC_OK), and SUCCESS as `{successRedirectUrl}` - so a
 * 2xx status alone does not mean success. Check `error` first.
 */
function parseResult(body: string): { error?: string; successRedirectUrl?: string } {
  try {
    const parsed: unknown = JSON.parse(body);
    if (parsed !== null && typeof parsed === "object") {
      const o = parsed as Record<string, unknown>;
      const out: { error?: string; successRedirectUrl?: string } = {};
      // Surface the server message, but cap length (don't echo arbitrary text).
      if (typeof o.error === "string" && o.error.length > 0 && o.error.length <= 300) out.error = o.error;
      if (typeof o.successRedirectUrl === "string") out.successRedirectUrl = o.successRedirectUrl;
      return out;
    }
  } catch {
    // non-JSON body - treat as opaque
  }
  return {};
}

/**
 * Module JAR/WAR upload form (jnt:fileUpload), client island.
 *
 * Replaces the previous plain-HTML multipart <form>, which posted a full page to
 * the `.do` and broke on CsrfGuard ("Request Token does not match Page Token") and
 * left the user on a blank page when the action returned a 200 error JSON. This
 * island posts via XHR (CSRF token attached) and renders the action's success /
 * error response inline.
 */
export default function FileUploadForm({ actionUrl, backUrl, accept, labels }: Readonly<FileUploadFormProps>) {
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [message, setMessage] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  // Hydration-ready signal (mirrors ModuleEditor): SSR omits it, set
  // after mount so tests can wait until the submit handler is attached.
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  const handleSubmit = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setStatus("error");
      setMessage(labels.pickFile);
      return;
    }
    setStatus("submitting");
    setMessage("");
    try {
      const data = new FormData();
      data.append("file", file);
      const res = await postMultipart(actionUrl, data);
      const result = parseResult(res.body);
      if (result.error) {
        // Failures arrive as HTTP 200 with {error} - surface them, don't redirect.
        setStatus("error");
        setMessage(result.error);
        return;
      }
      if (res.status >= 200 && res.status < 300) {
        globalThis.location.assign(result.successRedirectUrl || backUrl);
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
      data-upload-ready={ready ? "true" : undefined}
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
        <label htmlFor="module-jar">{labels.fileLabel}</label>
        <input id="module-jar" ref={fileRef} type="file" name="file" accept={accept} />
      </div>
      <button type="submit" className={styles.btn} disabled={status === "submitting"}>
        {status === "submitting" ? labels.submitting : labels.submit}
      </button>
    </form>
  );
}
