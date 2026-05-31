import { useEffect, useState } from "react";
import clsx from "clsx";
import styles from "./review.module.css";

interface ReviewLabels {
  heading: string;
  yourRating: string;
  titleLabel: string;
  titlePlaceholder: string;
  commentLabel: string;
  commentPlaceholder: string;
  submit: string;
  submitting: string;
  thanks: string;
  alreadyReviewed: string;
  pickRating: string;
  error: string;
}

interface ReviewFormProps {
  /** Render-servlet URL of the submitReview action on the module node. */
  actionUrl: string;
  /** Content language tag (e.g. "en"), so the review lands in the right locale. */
  language: string;
  /** True if the current user already reviewed this module — render a note instead of a form. */
  hasReviewed: boolean;
  /** Translated labels, computed server-side and passed in (survives hydration). */
  labels: ReviewLabels;
}

const STAR_VALUES = [1, 2, 3, 4, 5] as const;

/**
 * POST form-encoded data via XMLHttpRequest so Jahia's CSRF guard (which patches
 * XHR, not fetch) attaches the OWASP-CSRFTOKEN header automatically.
 */
function postForm(url: string, body: string): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url, true);
    xhr.withCredentials = true;
    xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
    xhr.setRequestHeader("Accept", "application/json");
    xhr.onload = () => resolve({ status: xhr.status, body: xhr.responseText });
    xhr.onerror = () => reject(new Error("Network error"));
    xhr.send(body);
  });
}

/**
 * In-site review form — the React replacement for the legacy jnt:addReview JSP.
 * Shown only to logged-in users (the server gates rendering). Posts a rating plus
 * optional title/comment to the privateappstore `submitReview` action, which
 * attributes the review to the caller and bypasses the module ACL so any user can
 * review a module they don't own. (An action — not a GraphQL mutation — because
 * the Jahia GraphQL endpoint is not reachable by ordinary users.) One review per
 * user: once submitted (or if already reviewed) it shows a confirmation.
 *
 * Submits via XMLHttpRequest (not fetch): Jahia's CSRF guard injects a
 * `/modules/CsrfServlet` script on every page that monkey-patches XHR to attach
 * the per-page OWASP-CSRFTOKEN header — it does NOT patch fetch, so a fetch POST
 * to the `.do` action would be rejected as a CSRF attack.
 */
export default function ReviewForm({ actionUrl, language, hasReviewed, labels }: Readonly<ReviewFormProps>) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  // Hydration-ready signal (mirrors ModuleEditor): SSR omits it, set after mount
  // so tests can wait until the click handlers are attached before interacting.
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  if (hasReviewed) {
    return (
      <p className={styles.note} data-review-ready="true">
        {labels.alreadyReviewed}
      </p>
    );
  }

  if (status === "done") {
    return (
      <output className={styles.done} data-review-done="true">
        {labels.thanks}
      </output>
    );
  }

  const handleSubmit = async () => {
    if (rating < 1) {
      setStatus("error");
      setMessage(labels.pickRating);
      return;
    }
    setStatus("submitting");
    setMessage("");
    try {
      const body = new URLSearchParams();
      body.set("rating", String(rating));
      if (title.trim()) body.set("title", title.trim());
      if (comment.trim()) body.set("comment", comment.trim());
      body.set("language", language);

      const res = await postForm(actionUrl, body.toString());
      if (res.status >= 200 && res.status < 300) {
        setStatus("done");
        return;
      }
      // The action returns user-facing messages ("You have already reviewed this
      // module", "Rating must be between 1 and 5") in {error}; surface them, but
      // narrow the parsed JSON safely and cap the length (don't echo arbitrary text).
      let msg = labels.error;
      try {
        const parsed: unknown = JSON.parse(res.body);
        if (
          parsed !== null &&
          typeof parsed === "object" &&
          "error" in parsed &&
          typeof (parsed as Record<string, unknown>).error === "string"
        ) {
          const err = (parsed as { error: string }).error;
          if (err.length > 0 && err.length <= 300) msg = err;
        }
      } catch {
        // keep the generic message
      }
      setStatus("error");
      setMessage(msg);
    } catch {
      setStatus("error");
      setMessage(labels.error);
    }
  };

  const shown = hover || rating;

  return (
    <form
      className={styles.form}
      data-review-ready={ready ? "true" : undefined}
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit();
      }}
    >
      <h3 className={styles.heading}>{labels.heading}</h3>
      {status === "error" && (
        <div className={styles.error} role="alert">
          {message}
        </div>
      )}

      <div className={styles.ratingRow}>
        <span className={styles.ratingLabel}>{labels.yourRating}</span>
        <div className={styles.stars} role="radiogroup" aria-label={labels.yourRating}>
          {STAR_VALUES.map((v) => (
            <label
              key={v}
              className={clsx(styles.star, v <= shown && styles.starOn)}
              data-star={v}
              aria-label={`${v} star${v === 1 ? "" : "s"}`}
              onMouseEnter={() => setHover(v)}
              onMouseLeave={() => setHover(0)}
            >
              <input
                type="radio"
                name="rating"
                value={v}
                checked={rating === v}
                className={styles.starInput}
                onChange={() => setRating(v)}
                onFocus={() => setHover(v)}
                onBlur={() => setHover(0)}
              />
              <span aria-hidden="true">★</span>
            </label>
          ))}
        </div>
      </div>

      <div className={styles.field}>
        <label htmlFor="review-title">{labels.titleLabel}</label>
        <input
          id="review-title"
          value={title}
          maxLength={120}
          placeholder={labels.titlePlaceholder}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="review-comment">{labels.commentLabel}</label>
        <textarea
          id="review-comment"
          rows={4}
          value={comment}
          maxLength={2000}
          placeholder={labels.commentPlaceholder}
          onChange={(e) => setComment(e.target.value)}
        />
      </div>

      <div>
        <button type="submit" className={styles.submit} disabled={status === "submitting"}>
          {status === "submitting" ? labels.submitting : labels.submit}
        </button>
      </div>
    </form>
  );
}
