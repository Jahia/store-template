import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import clsx from "clsx";
import styles from "./admin.module.css";
import { gqlRequest, useGqlQuery } from "./gql";
import {
  GET_MANAGE_ROLES_SETTINGS,
  GRANT_SITE_ROLE,
  REVOKE_SITE_ROLE,
  SEARCH_FORGE_PRINCIPALS,
} from "./ManageRoles.gql";

interface Principal {
  name: string;
  type: string;
  displayName?: string;
}
interface RoleEntry {
  role: string;
  members: Principal[];
}
interface ManageRolesData {
  manageRolesSettings: {
    siteKey: string;
    roles: RoleEntry[];
  } | null;
}

/**
 * Roles screen — ported from privateappstore's React admin app.
 * Logic/i18n unchanged; Moonstone→HTML, Apollo→fetch. The original useLazyQuery
 * search becomes an on-demand fetch into local state.
 */
export function ManageRoles({ siteKey }: Readonly<{ siteKey: string }>) {
  const { t } = useTranslation("privateappstore");

  const [openRole, setOpenRole] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchType, setSearchType] = useState<"USER" | "GROUP">("USER");
  const [status, setStatus] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [searchResults, setSearchResults] = useState<Principal[] | null>(null);
  const [searching, setSearching] = useState(false);

  const { data, loading, error, refetch } = useGqlQuery<ManageRolesData>(GET_MANAGE_ROLES_SETTINGS, {
    siteKey,
  });

  useEffect(() => {
    const prev = document.title;
    document.title = `${t("roles.title")} — ${siteKey} — Jahia`;
    return () => {
      document.title = prev;
    };
  }, [siteKey, t]);

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

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    setSearching(true);
    try {
      const res = await gqlRequest<{ searchForgePrincipals: Principal[] }>(SEARCH_FORGE_PRINCIPALS, {
        siteKey,
        searchTerm: searchTerm.trim(),
        type: searchType,
      });
      setSearchResults(res.searchForgePrincipals || []);
    } catch (err) {
      reportError(err);
    } finally {
      setSearching(false);
    }
  };

  const handleGrant = async (principal: Principal) => {
    try {
      await gqlRequest(GRANT_SITE_ROLE, {
        siteKey,
        role: openRole,
        principalName: principal.name,
        principalType: principal.type,
      });
      await refetch();
      reportSuccess("roles.success.granted");
      setOpenRole(null);
      setSearchTerm("");
      setSearchResults(null);
    } catch (err) {
      reportError(err);
    }
  };

  const handleRevoke = async (role: string, member: Principal) => {
    const confirmed = globalThis.confirm(
      t("roles.revoke.confirm", { principal: member.displayName || member.name, role }),
    );
    if (!confirmed) return;
    try {
      await gqlRequest(REVOKE_SITE_ROLE, {
        siteKey,
        role,
        principalName: member.name,
        principalType: member.type,
      });
      await refetch();
      reportSuccess("roles.success.revoked");
    } catch (err) {
      reportError(err);
    }
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

  const settings = data?.manageRolesSettings;
  if (!settings) {
    return <div className={styles.error}>{t("errors.load.failed")}</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.pageHeader}>
        <h2>
          {t("roles.title")} — {siteKey}
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

      {settings.roles.map((roleEntry) => (
        <section key={roleEntry.role} className={styles.section}>
          <h3 className={styles.sectionTitle}>
            {t(`roles.names.${roleEntry.role}`, { defaultValue: roleEntry.role })}
          </h3>

          {roleEntry.members.length === 0 ? (
            <div className={styles.meta}>{t("roles.empty")}</div>
          ) : (
            <ul className={styles.list}>
              {roleEntry.members.map((member) => (
                <li key={`${member.type}:${member.name}`} className={styles.item}>
                  <span>
                    {member.displayName || member.name}
                    <span className={styles.memberType}>{member.type}</span>
                  </span>
                  <button
                    type="button"
                    className={clsx(styles.btn, styles.danger, styles.small)}
                    onClick={() => handleRevoke(roleEntry.role, member)}
                  >
                    {t("label.revoke")}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {openRole === roleEntry.role ? (
            <div>
              <div className={styles.row}>
                <div className={styles.typeToggle}>
                  <button
                    type="button"
                    className={clsx(styles.btn, styles.small, searchType === "USER" ? styles.primary : styles.secondary)}
                    onClick={() => setSearchType("USER")}
                  >
                    {t("roles.search.users")}
                  </button>
                  <button
                    type="button"
                    className={clsx(styles.btn, styles.small, searchType === "GROUP" ? styles.primary : styles.secondary)}
                    onClick={() => setSearchType("GROUP")}
                  >
                    {t("roles.search.groups")}
                  </button>
                </div>
                <div className={styles.field}>
                  <label htmlFor={`search-${roleEntry.role}`}>{t("roles.search.label")}</label>
                  <input
                    id={`search-${roleEntry.role}`}
                    placeholder={t("roles.search.placeholder")}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  />
                </div>
                <button
                  type="button"
                  className={clsx(styles.btn, styles.secondary, styles.small)}
                  disabled={searching || !searchTerm.trim()}
                  onClick={handleSearch}
                >
                  {searching ? t("label.loading") : t("roles.search.action")}
                </button>
                <button
                  type="button"
                  className={clsx(styles.btn, styles.ghost, styles.small)}
                  onClick={() => {
                    setOpenRole(null);
                    setSearchTerm("");
                    setSearchResults(null);
                  }}
                >
                  {t("label.cancel")}
                </button>
              </div>
              {searchResults && searchResults.length > 0 ? (
                <ul className={styles.searchResults}>
                  {searchResults.map((p) => (
                    <li key={`${p.type}:${p.name}`}>
                      <button
                        type="button"
                        className={styles.searchResult}
                        onClick={() => handleGrant(p)}
                      >
                        {p.displayName || p.name} <span className={styles.memberType}>{p.type}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                searchResults && <div className={styles.meta}>{t("roles.search.noResults")}</div>
              )}
            </div>
          ) : (
            <button
              type="button"
              className={clsx(styles.btn, styles.secondary, styles.small)}
              onClick={() => {
                setOpenRole(roleEntry.role);
                setSearchTerm("");
                setSearchResults(null);
              }}
            >
              {t("roles.addMember")}
            </button>
          )}
        </section>
      ))}
    </div>
  );
}

export default ManageRoles;
