import {
  buildNodeUrl,
  getChildNodes,
  Island,
  Render,
  useServerContext,
} from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import clsx from "clsx";
import styles from "./detail.module.css";
import { forgeIconUrl } from "./forgeCard";
import { str, bool } from "./nodeProps";
import { sortedVersionNodes } from "./versions";
import Lightbox from "./Lightbox.client";
import ModuleEditor from "./ModuleEditor.client";
import ScreenshotManager from "./ScreenshotManager.client";
import ReviewForm from "./ReviewForm.client";

const REVIEW_LABELS = {
  heading: "Write a review",
  yourRating: "Your rating",
  titleLabel: "Title",
  titlePlaceholder: "Sum up your experience",
  commentLabel: "Review",
  commentPlaceholder: "What did you think of this module?",
  submit: "Post review",
  submitting: "Posting…",
  thanks: "Thanks! Your review has been posted.",
  alreadyReviewed: "You've already reviewed this module.",
  pickRating: "Please pick a rating first.",
  error: "Could not post your review — please try again.",
};

const EDITOR_LABELS = {
  edit: "Edit module",
  save: "Save",
  saving: "Saving…",
  cancel: "Cancel",
  saved: "Saved",
  error: "Save failed — check your permissions and try again.",
  title: "Title",
  description: "Description",
  howToInstall: "How to install",
  faq: "FAQ",
  license: "License",
  authorEmail: "Author email",
  authorURL: "Author URL",
  codeRepository: "Code repository",
};

function screenshotItems(node: JCRNodeWrapper): { name: string; url: string }[] {
  if (!node.hasNode("screenshots")) return [];
  return getChildNodes(node.getNode("screenshots"), 20, 0, (n) => n.isNodeType("jnt:file")).map(
    (f) => ({ name: f.getName(), url: buildNodeUrl(f) }),
  );
}

interface Review {
  rating: number;
  title: string;
  content: string;
  author: string;
}

function reviewItems(node: JCRNodeWrapper): Review[] {
  if (!node.hasNode("reviews")) return [];
  return getChildNodes(node.getNode("reviews"), 100, 0, (n) => n.isNodeType("jnt:review")).map((r) => ({
    rating: r.hasProperty("rating") ? Number(r.getProperty("rating").getLong()) : 0,
    title: str(r, "jcr:title"),
    content: str(r, "content"),
    author: str(r, "jcr:createdBy"),
  }));
}

function stars(rating: number): string {
  const n = Math.max(0, Math.min(5, Math.round(rating)));
  return "★".repeat(n) + "☆".repeat(5 - n);
}

/** Only http(s) URLs are safe to render as a link href (blocks stored javascript:/data: URLs). */
function isHttpUrl(url: string): boolean {
  return /^https?:\/\//i.test(url.trim());
}

/**
 * Detail of a forge module/package: header, description, video, screenshots
 * (lightbox), versions (rendered via their `default` view), metadata, an in-site
 * editor (owners) and reviews.
 *
 * Richtext fields (description, license) are rendered with dangerouslySetInnerHTML.
 * Defense-in-depth against stored XSS: the editor sanitizes with DOMPurify on save
 * and a strict CSP is the backstop (see docs/SECURITY-CSP.md). Content written
 * outside the editor (legacy JSP authoring, direct JCR/GraphQL writes) is NOT
 * sanitized here — enable Jahia's server-side richtext HTML filtering for the store
 * site to cover those paths.
 */
export function ForgeEntryDetail({ node }: { node: JCRNodeWrapper }): JSX.Element {
  const { currentResource, renderContext } = useServerContext();
  const title = str(node, "jcr:title") || node.getName();
  const description = str(node, "description");
  const license = str(node, "license");
  const codeRepository = str(node, "codeRepository");
  const status = str(node, "status");
  const supported = bool(node, "supportedByJahia");
  const reviewed = bool(node, "reviewedByJahia");
  const icon = forgeIconUrl(node);
  const shots = screenshotItems(node);
  const screenshotsPath = node.hasNode("screenshots") ? node.getNode("screenshots").getPath() : "";
  const versions = sortedVersionNodes(node);
  const videoNode = node.hasNode("video") ? node.getNode("video") : null;
  const canEdit = node.hasPermission("jcr:write");
  const language = currentResource.getLocale().getLanguage();
  const reviews = reviewItems(node);
  const avgRating =
    reviews.length > 0
      ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10
      : 0;
  const isLoggedIn = renderContext.isLoggedIn();
  const currentUsername = isLoggedIn ? renderContext.getUser().getName() : "";
  const hasReviewed = currentUsername !== "" && reviews.some((r) => r.author === currentUsername);

  return (
    <article className={styles.detail}>
      <header className={styles.head}>
        <div className={styles.headIcon}>
          {icon ? (
            <img src={icon} alt="" width="80" height="80" />
          ) : (
            <span className={styles.headIconPlaceholder} aria-hidden="true">
              {title.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div>
          <h1 className={styles.title}>{title}</h1>
          <div className={styles.badges}>
            {status && (
              <span className={clsx(styles.badge, styles.status)} data-status={status}>
                {status}
              </span>
            )}
            {supported && <span className={clsx(styles.badge, styles.supported)}>Supported by Jahia</span>}
            {reviewed && <span className={clsx(styles.badge, styles.reviewed)}>Reviewed by Jahia</span>}
            {reviews.length > 0 && (
              <span className={styles.ratingBadge} title={`${avgRating} / 5`}>
                <span className={styles.stars} aria-hidden="true">
                  {stars(avgRating)}
                </span>
                <span className={styles.ratingCount}>({reviews.length})</span>
              </span>
            )}
          </div>
        </div>
      </header>

      {canEdit && (
        <Island
          component={ModuleEditor}
          props={{
            path: node.getPath(),
            language,
            values: {
              "jcr:title": title,
              description,
              howToInstall: str(node, "howToInstall"),
              FAQ: str(node, "FAQ"),
              license,
              authorEmail: str(node, "authorEmail"),
              authorURL: str(node, "authorURL"),
              codeRepository,
            },
            labels: EDITOR_LABELS,
          }}
        />
      )}

      {description && (
        <section className={styles.section}>
          <div className={styles.richtext} dangerouslySetInnerHTML={{ __html: description }} />
        </section>
      )}

      {videoNode && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Video</h2>
          <Render node={videoNode} view="default" readOnly />
        </section>
      )}

      {shots.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Screenshots</h2>
          {canEdit ? (
            <Island component={ScreenshotManager} props={{ path: screenshotsPath, items: shots }} />
          ) : (
            <Island component={Lightbox} props={{ images: shots.map((s) => s.url) }} />
          )}
        </section>
      )}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Versions</h2>
        {versions.length === 0 ? (
          <p className={styles.muted}>No versions published yet.</p>
        ) : (
          <div className={styles.versions}>
            {versions.map((v) => (
              <Render key={v.getIdentifier()} node={v} view="default" readOnly />
            ))}
          </div>
        )}
      </section>

      {(license || codeRepository) && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Details</h2>
          <dl className={styles.meta}>
            {codeRepository && (
              <>
                <dt>Source</dt>
                <dd>
                  {isHttpUrl(codeRepository) ? (
                    <a href={codeRepository} rel="noopener noreferrer nofollow" target="_blank">
                      {codeRepository}
                    </a>
                  ) : (
                    codeRepository
                  )}
                </dd>
              </>
            )}
            {license && (
              <>
                <dt>License</dt>
                <dd>
                  <span className={styles.richtext} dangerouslySetInnerHTML={{ __html: license }} />
                </dd>
              </>
            )}
          </dl>
        </section>
      )}

      {(reviews.length > 0 || isLoggedIn) && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Reviews</h2>
          {isLoggedIn && (
            <Island
              component={ReviewForm}
              props={{
                actionUrl: `${buildNodeUrl(node).replace(/\.html$/, "")}.SubmitReview.do`,
                language,
                hasReviewed,
                labels: REVIEW_LABELS,
              }}
            />
          )}
          {reviews.length > 0 ? (
            <ul className={styles.reviews}>
              {reviews.map((r, i) => (
                <li key={`${r.author}-${i}`} className={styles.review}>
                  <div className={styles.reviewHead}>
                    <span className={styles.stars} aria-label={`${r.rating} / 5`}>
                      {stars(r.rating)}
                    </span>
                    {r.title && <span className={styles.reviewTitle}>{r.title}</span>}
                    {r.author && <span className={styles.reviewAuthor}>{r.author}</span>}
                  </div>
                  {r.content && <p className={styles.reviewContent}>{r.content}</p>}
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.muted}>
              No reviews yet.{isLoggedIn ? " Be the first to review this module." : ""}
            </p>
          )}
        </section>
      )}
    </article>
  );
}
