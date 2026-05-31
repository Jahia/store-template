import { useEffect, useState } from "react";
import clsx from "clsx";
import styles from "./review.module.css";
import { gqlRequest } from "~/lib/graphql";

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
  /** UUID of the module/package being reviewed. */
  moduleId: string;
  /** Content language tag (e.g. "en"), so the review lands in the right locale. */
  language: string;
  /** True if the current user already reviewed this module — render a note instead of a form. */
  hasReviewed: boolean;
  /** Translated labels, computed server-side and passed in (survives hydration). */
  labels: ReviewLabels;
}

interface SubmitResult {
  submitForgeReview: {
    rating: number;
    reviewCount: number;
    averageRating: number;
    author: string;
  };
}

const SUBMIT_REVIEW = /* GraphQL */ `
  mutation SubmitForgeReview(
    $moduleId: String!
    $rating: Int!
    $title: String
    $comment: String
    $language: String
  ) {
    submitForgeReview(
      moduleId: $moduleId
      rating: $rating
      title: $title
      comment: $comment
      language: $language
    ) {
      rating
      reviewCount
      averageRating
      author
    }
  }
`;

const STAR_VALUES = [1, 2, 3, 4, 5] as const;

/**
 * In-site review form — the React replacement for the legacy jnt:addReview JSP.
 * Shown only to logged-in users (the server gates rendering). Posts a rating plus
 * optional title/comment through the privileged `submitForgeReview` mutation,
 * which attributes the review to the caller and bypasses the module ACL so any
 * user can review a module they don't own. One review per user: once submitted
 * (or if already reviewed) it shows a confirmation instead of the form.
 */
export default function ReviewForm({ moduleId, language, hasReviewed, labels }: ReviewFormProps) {
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
      <p className={styles.done} role="status" data-review-done="true">
        {labels.thanks}
      </p>
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
      await gqlRequest<SubmitResult>(SUBMIT_REVIEW, {
        moduleId,
        rating,
        title: title.trim() || null,
        comment: comment.trim() || null,
        language,
      });
      setStatus("done");
    } catch (err) {
      setStatus("error");
      // The mutation returns user-facing messages ("You have already reviewed this
      // module", "Rating must be between 1 and 5"), so surface them directly.
      setMessage(err instanceof Error && err.message ? err.message : labels.error);
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
            <button
              key={v}
              type="button"
              className={clsx(styles.star, v <= shown && styles.starOn)}
              role="radio"
              aria-checked={rating === v}
              aria-label={String(v)}
              data-star={v}
              onMouseEnter={() => setHover(v)}
              onMouseLeave={() => setHover(0)}
              onFocus={() => setHover(v)}
              onBlur={() => setHover(0)}
              onClick={() => setRating(v)}
            >
              ★
            </button>
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
