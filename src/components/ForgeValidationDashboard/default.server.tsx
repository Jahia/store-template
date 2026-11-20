import { buildNodeUrl, Island, jahiaComponent } from "@jahia/javascript-modules-library";
import { useTranslation } from "react-i18next";
import styles from "~/components/forge/validation.module.css";
import { StatusBadge } from "~/components/forge/ValidationBadge";
import { validationLabels } from "~/components/forge/validationLabels";
import { validationsOf, versionNodeOf, type Validation } from "~/components/forge/validation";
import ValidationCheckAnswer from "~/components/forge/ValidationCheckAnswer.client";
import InvalidateVersionButton from "~/components/forge/InvalidateVersionButton.client";

const MODERATE_PERMISSION = "jahiaForgeModerateModule";

/**
 * The validation dashboard of a store (jnt:forgeValidationDashboard), for its administrators:
 * the versions waiting for a check or a review, with the prompt of each manual check and a box
 * for its answer; the rejected versions with their reasons; the approved ones, each with a
 * control that invalidates it (jahia-store docs/validation.md).
 */
jahiaComponent(
  {
    nodeType: "jnt:forgeValidationDashboard",
    name: "default",
    displayName: "Validation dashboard",
    componentType: "view",
    // The page lists what an administrator may act on, and the prompts; never cache it per role.
    properties: { "cache.perUser": "true", "cache.expiration": "0" },
  },
  (_props: object, { currentNode, renderContext }) => {
    const { t } = useTranslation();
    const site = renderContext.getSite();
    if (!renderContext.isLoggedIn() || !site.hasPermission(MODERATE_PERMISSION)) {
      return <div className={styles.empty}>{t("validation.dashboard.forbidden")}</div>;
    }
    const siteKey = site.getSiteKey();
    const session = currentNode.getSession();
    const labels = validationLabels(t);
    const records = validationsOf(session, siteKey);
    const waiting = records.filter((r) => r.status === "pending" || r.status === "review");
    const rejected = records.filter((r) => r.status === "rejected");
    const approved = records.filter((r) => r.status === "approved");

    const answerLabels = {
      prompt: t("validation.dashboard.prompt"),
      copy: t("validation.dashboard.copy"),
      copied: t("validation.dashboard.copied"),
      answerPlaceholder: t("validation.dashboard.answerPlaceholder"),
      record: t("validation.dashboard.record"),
      recording: t("validation.dashboard.recording"),
      error: t("validation.error"),
    };
    const invalidateLabels = {
      invalidate: t("validation.dashboard.invalidate"),
      reasonPlaceholder: t("validation.dashboard.reasonPlaceholder"),
      confirm: t("validation.dashboard.confirmInvalidate"),
      cancel: t("validation.dashboard.cancel"),
      invalidating: t("validation.dashboard.invalidating"),
      error: t("validation.error"),
    };

    const moduleUrl = (record: Validation): string | null => {
      const node = versionNodeOf(session, siteKey, record);
      try {
        return node ? buildNodeUrl(node.getParent() as never) : null;
      } catch {
        return null;
      }
    };

    const Record = ({ record }: { record: Validation }) => {
      const url = moduleUrl(record);
      return (
        <article className={styles.record} data-validation-record={`${record.moduleName}/${record.version}`} data-validation-status={record.status}>
          <div className={styles.recordHead}>
            <span className={styles.recordTitle}>
              {url ? <a href={url}>{record.moduleName}</a> : record.moduleName} {record.version}
            </span>
            <StatusBadge status={record.status} label={labels.statuses[record.status]} />
            <span className={styles.meta}>
              {t("validation.dashboard.requestedBy", { user: record.requestedBy, date: record.requestedAt })}
            </span>
            {record.artifactUrl && (
              <a className={styles.meta} href={record.artifactUrl}>
                {t("validation.dashboard.artifact")}
              </a>
            )}
          </div>
          {record.reason && (
            <p className={styles.reason}>
              <strong>{labels.reason}</strong> {record.reason}
            </p>
          )}
          <ul className={styles.checks}>
            {record.checks.map((check) => (
              <li key={check.key} className={styles.check} data-validation-check={check.key}>
                <span className={styles.checkLabel}>{check.label}</span>
                <StatusBadge status={check.status} label={labels.statuses[check.status]} />
                {check.updatedAt && (
                  <span className={styles.meta}>
                    {check.updatedBy} · {check.updatedAt}
                  </span>
                )}
                {check.comments.length > 0 && (
                  <ul className={styles.comments}>
                    {check.comments.map((comment, i) => (
                      <li key={i}>{comment}</li>
                    ))}
                  </ul>
                )}
                {check.status === "review" && check.prompt && (
                  <div style={{ flexBasis: "100%" }}>
                    <Island
                      component={ValidationCheckAnswer}
                      props={{
                        siteKey,
                        moduleName: record.moduleName,
                        version: record.version,
                        checkKey: check.key,
                        prompt: check.prompt,
                        labels: answerLabels,
                      }}
                    />
                  </div>
                )}
              </li>
            ))}
          </ul>
          {record.status !== "rejected" && (
            <Island
              component={InvalidateVersionButton}
              props={{ siteKey, moduleName: record.moduleName, version: record.version, labels: invalidateLabels }}
            />
          )}
        </article>
      );
    };

    const Section = ({ id, title, items }: { id: string; title: string; items: Validation[] }) => (
      <section className={styles.section} data-validation-section={id}>
        <h2>
          {title} ({items.length})
        </h2>
        {items.length === 0 ? (
          <p className={styles.empty}>{t("validation.dashboard.empty")}</p>
        ) : (
          items.map((record) => <Record key={`${record.moduleName}/${record.version}`} record={record} />)
        )}
      </section>
    );

    return (
      <div className={styles.dashboard} data-validation-dashboard="">
        <Section id="waiting" title={t("validation.dashboard.waiting")} items={waiting} />
        <Section id="rejected" title={t("validation.dashboard.rejected")} items={rejected} />
        <Section id="approved" title={t("validation.dashboard.approved")} items={approved} />
      </div>
    );
  },
);
