import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import clsx from "clsx";
import styles from "./admin.module.css";
import { gqlRequest, useGqlQuery } from "./gql";
import { GET_FORGE_SETTINGS, UPDATE_FORGE_SETTINGS } from "./ForgeSettings.gql";

interface ForgeSettingsData {
  forgeSettings: {
    siteKey: string;
    url?: string;
    id?: string;
    user?: string;
    passwordSet?: boolean;
  } | null;
}

/**
 * Forge settings screen — ported from privateappstore's React admin app.
 *
 * Logic, Apollo queries/mutations and i18n are unchanged; only the Moonstone
 * primitives (Field/Input/Button) were replaced with plain accessible HTML +
 * admin.module.css, so it runs in a React 19 island (Moonstone is React 18).
 */
export function ForgeSettings({ siteKey }: { siteKey: string }) {
  const { t } = useTranslation("privateappstore");

  const [url, setUrl] = useState("");
  const [id, setId] = useState("");
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [passwordSet, setPasswordSet] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const { data, loading, error, refetch } = useGqlQuery<ForgeSettingsData>(GET_FORGE_SETTINGS, {
    siteKey,
  });
  const [saving, setSaving] = useState(false);

  const syncFromSettings = (s: {
    url?: string;
    id?: string;
    user?: string;
    passwordSet?: boolean;
  }) => {
    setUrl(s.url || "");
    setId(s.id || "");
    setUser(s.user || "");
    setPassword("");
    setPasswordSet(Boolean(s.passwordSet));
  };

  useEffect(() => {
    if (data && data.forgeSettings) {
      syncFromSettings(data.forgeSettings);
    }
  }, [data]);

  const handleSubmit = async () => {
    setSaveStatus("saving");
    setSaving(true);
    try {
      const result = await gqlRequest<{ updateForgeSettings: unknown }>(UPDATE_FORGE_SETTINGS, {
        siteKey,
        url: url || null,
        id: id || null,
        user: user || null,
        // Blank password = keep existing (matches the legacy flow's behaviour).
        password: password || null,
      });
      setSaveStatus(result && result.updateForgeSettings ? "success" : "error");
      setPassword("");
      await refetch();
    } catch (err) {
      console.error("Failed to update forge settings:", err);
      setSaveStatus("error");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (data && data.forgeSettings) {
      syncFromSettings(data.forgeSettings);
    }
    setSaveStatus("cancel");
  };

  if (loading) {
    return <div className={styles.loading}>{t("label.loading")}</div>;
  }

  if (error) {
    return (
      <div className={styles.error} role="alert">
        {t("errors.load.failed")}: {error.message}
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.pageHeader}>
        <h2>
          {t("label.title")} — {siteKey}
        </h2>
      </div>

      {saveStatus === "success" && (
        <div className={clsx(styles.alert, styles.success)}>{t("success.update")}</div>
      )}
      {saveStatus === "error" && (
        <div className={clsx(styles.alert, styles.error)} role="alert">
          {t("errors.update.failed")}
        </div>
      )}

      <div className={styles.form}>
        <div className={styles.field}>
          <label htmlFor="forge-url">{t("label.url")}</label>
          <input
            id="forge-url"
            value={url}
            placeholder="https://store.jahia.com"
            onChange={(e) => setUrl(e.target.value)}
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="forge-id">{t("label.id")}</label>
          <input id="forge-id" value={id} onChange={(e) => setId(e.target.value)} />
        </div>

        <div className={styles.field}>
          <label htmlFor="forge-user">{t("label.user")}</label>
          <input id="forge-user" value={user} onChange={(e) => setUser(e.target.value)} />
        </div>

        <div className={styles.field}>
          <label htmlFor="forge-password">{t("label.password")}</label>
          <input
            id="forge-password"
            type="password"
            value={password}
            placeholder={passwordSet ? t("label.password.unchanged") : ""}
            onChange={(e) => setPassword(e.target.value)}
          />
          <div className={styles.hint}>
            {passwordSet ? t("label.password.replaceHint") : t("label.password.newHint")}
          </div>
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            className={clsx(styles.btn, styles.primary)}
            disabled={saving}
            onClick={handleSubmit}
          >
            {saving ? t("label.saving") : t("label.save")}
          </button>
          <button
            type="button"
            className={clsx(styles.btn, styles.secondary)}
            disabled={saving}
            onClick={handleCancel}
          >
            {t("label.cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ForgeSettings;
