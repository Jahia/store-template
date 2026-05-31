import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import clsx from "clsx";
import styles from "./admin.module.css";
import { gqlRequest, useGqlQuery } from "./gql";
import {
  ADD_FORGE_CATEGORY,
  DELETE_FORGE_CATEGORY,
  GET_CATEGORY_SETTINGS,
  SET_ROOT_CATEGORY,
  UPDATE_FORGE_CATEGORY_TITLES,
} from "./CategorySettings.gql";

interface CategoryTitle {
  language: string;
  title: string;
}
interface Category {
  uuid: string;
  name: string;
  displayName: string;
  titles: CategoryTitle[];
  usages: string[];
}
interface CategorySettingsData {
  forgeCategorySettings: {
    siteKey: string;
    rootCategoryUuid?: string;
    rootCategoryPath?: string;
    rootCategoryDisplayName?: string;
    siteLanguages: string[];
    categories: Category[];
  } | null;
}

/**
 * Categories screen — ported from privateappstore's React admin app.
 * Logic/i18n unchanged; Moonstone→HTML, Apollo→fetch (see gql.ts / admin.module.css).
 */
export function CategorySettings({ siteKey }: { siteKey: string }) {
  const { t } = useTranslation("privateappstore");

  const [rootCategoryInput, setRootCategoryInput] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingUuid, setEditingUuid] = useState<string | null>(null);
  const [editingTitles, setEditingTitles] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("");

  const { data, loading, error, refetch } = useGqlQuery<CategorySettingsData>(GET_CATEGORY_SETTINGS, {
    siteKey,
  });

  useEffect(() => {
    const prev = document.title;
    document.title = `${t("categories.title")} — ${siteKey} — Jahia`;
    return () => {
      document.title = prev;
    };
  }, [siteKey, t]);

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

  const settings = data && data.forgeCategorySettings;
  if (!settings) {
    return (
      <div className={styles.error} role="alert">
        {t("errors.load.failed")}
      </div>
    );
  }

  const reportSuccess = (key: string) => {
    setStatus("success");
    setStatusMessage(t(key));
  };
  const reportError = (err: unknown) => {
    console.error(err);
    setStatus("error");
    const message = err instanceof Error ? err.message : "";
    setStatusMessage(message || t("errors.update.failed"));
  };

  const openEditor = (category: Category) => {
    const titles: Record<string, string> = {};
    for (const lang of settings.siteLanguages) {
      const existing = category.titles.find((x) => x.language === lang);
      titles[lang] = (existing && existing.title) || "";
    }
    setEditingUuid(category.uuid);
    setEditingTitles(titles);
  };

  const closeEditor = () => {
    setEditingUuid(null);
    setEditingTitles({});
  };

  const handleSetRoot = async () => {
    const uuid = rootCategoryInput.trim();
    if (!uuid) return;
    try {
      await gqlRequest(SET_ROOT_CATEGORY, { siteKey, rootCategoryUuid: uuid });
      setRootCategoryInput("");
      await refetch();
      reportSuccess("categories.success.root");
    } catch (err) {
      reportError(err);
    }
  };

  const handleAdd = async () => {
    const name = newCategoryName.trim();
    if (!name) return;
    try {
      const added = await gqlRequest<{ addForgeCategory: string }>(ADD_FORGE_CATEGORY, {
        siteKey,
        name,
      });
      setNewCategoryName("");
      reportSuccess("categories.success.add");
      // Auto-open the editor for the new category.
      const newUuid = added && added.addForgeCategory;
      const refreshed = await refetch();
      const created = refreshed?.forgeCategorySettings?.categories?.find((c) => c.uuid === newUuid);
      if (created) {
        openEditor(created);
      }
    } catch (err) {
      reportError(err);
    }
  };

  const handleSaveTitles = async () => {
    const titlesPayload = Object.entries(editingTitles).map(([language, title]) => ({
      language,
      title: title || null,
    }));
    try {
      await gqlRequest(UPDATE_FORGE_CATEGORY_TITLES, {
        siteKey,
        uuid: editingUuid,
        titles: titlesPayload,
      });
      await refetch();
      reportSuccess("categories.success.titles");
      closeEditor();
    } catch (err) {
      reportError(err);
    }
  };

  const handleDelete = async (category: Category) => {
    if (category.usages && category.usages.length > 0) {
      const confirmed = window.confirm(
        t("categories.delete.confirmInUse", { count: category.usages.length }),
      );
      if (!confirmed) return;
    }
    try {
      await gqlRequest(DELETE_FORGE_CATEGORY, { siteKey, uuid: category.uuid });
      if (editingUuid === category.uuid) {
        closeEditor();
      }
      await refetch();
      reportSuccess("categories.success.delete");
    } catch (err) {
      reportError(err);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.pageHeader}>
        <h2>
          {t("categories.title")} — {siteKey}
        </h2>
      </div>

      {status === "success" && (
        <div className={clsx(styles.alert, styles.success)}>{statusMessage}</div>
      )}
      {status === "error" && (
        <div className={clsx(styles.alert, styles.error)} role="alert">
          {statusMessage}
        </div>
      )}

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>{t("categories.root.heading")}</h3>
        <div className={styles.meta}>
          {settings.rootCategoryPath
            ? `${settings.rootCategoryDisplayName} (${settings.rootCategoryPath})`
            : t("categories.root.none")}
        </div>
        <div className={styles.row}>
          <div className={styles.field}>
            <label htmlFor="root-category-uuid">{t("categories.root.uuidField")}</label>
            <input
              id="root-category-uuid"
              placeholder={t("categories.root.uuidPlaceholder")}
              value={rootCategoryInput}
              onChange={(e) => setRootCategoryInput(e.target.value)}
            />
          </div>
          <button
            type="button"
            className={clsx(styles.btn, styles.primary)}
            disabled={!rootCategoryInput.trim()}
            onClick={handleSetRoot}
          >
            {t("label.save")}
          </button>
        </div>
      </section>

      {settings.rootCategoryUuid && (
        <>
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>{t("categories.list.heading")}</h3>
            {settings.categories.length === 0 ? (
              <div className={styles.meta}>{t("categories.list.empty")}</div>
            ) : (
              <ul className={styles.list}>
                {settings.categories.map((c) => (
                  <li key={c.uuid} className={styles.item}>
                    <div>
                      <div>{c.displayName}</div>
                      <div className={styles.meta}>
                        {c.titles
                          .filter((x) => x.title)
                          .map((x) => x.language)
                          .join(", ") || t("categories.list.untranslated")}
                        {c.usages.length > 0 && (
                          <> · {t("categories.list.usages", { count: c.usages.length })}</>
                        )}
                      </div>
                    </div>
                    <div className={styles.itemActions}>
                      <button
                        type="button"
                        className={clsx(styles.btn, styles.secondary, styles.small)}
                        onClick={() => openEditor(c)}
                      >
                        {t("label.edit")}
                      </button>
                      <button
                        type="button"
                        className={clsx(styles.btn, styles.danger, styles.small)}
                        onClick={() => handleDelete(c)}
                      >
                        {t("label.delete")}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {editingUuid && (
            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>{t("categories.editor.heading")}</h3>
              <div className={styles.form}>
                {settings.siteLanguages.map((lang) => (
                  <div key={lang} className={styles.field}>
                    <label htmlFor={`title-${lang}`}>{lang}</label>
                    <input
                      id={`title-${lang}`}
                      value={editingTitles[lang] || ""}
                      onChange={(e) =>
                        setEditingTitles((prev) => ({ ...prev, [lang]: e.target.value }))
                      }
                    />
                  </div>
                ))}
                <div className={styles.actions}>
                  <button
                    type="button"
                    className={clsx(styles.btn, styles.primary)}
                    onClick={handleSaveTitles}
                  >
                    {t("label.save")}
                  </button>
                  <button
                    type="button"
                    className={clsx(styles.btn, styles.secondary)}
                    onClick={closeEditor}
                  >
                    {t("label.cancel")}
                  </button>
                </div>
              </div>
            </section>
          )}

          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>{t("categories.add.heading")}</h3>
            <div className={styles.row}>
              <div className={styles.field}>
                <label htmlFor="new-category-name">{t("categories.add.nameField")}</label>
                <input
                  id="new-category-name"
                  placeholder={t("categories.add.namePlaceholder")}
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                />
              </div>
              <button
                type="button"
                className={clsx(styles.btn, styles.primary)}
                disabled={!newCategoryName.trim()}
                onClick={handleAdd}
              >
                {t("label.add")}
              </button>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

export default CategorySettings;
