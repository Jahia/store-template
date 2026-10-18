import { buildNodeUrl, Island, jahiaComponent } from "@jahia/javascript-modules-library";
import { useTranslation } from "react-i18next";
import styles from "~/components/forge/upload.module.css";
import FileUploadForm from "./FileUpload.client";
import GitRepositoryForm from "./GitRepositoryForm.client";

/**
 * The two ways a developer submits a module (jnt:fileUpload):
 *
 * - upload a package: posts (multipart) to the jahia-store `createEntryFromJar` action on
 *   modules-repository - the one piece of authoring that stays a Java action (it parses the
 *   JAR's package.json, runs a Maven deploy to the configured forge, then creates the
 *   jnt:forgeModule + version nodes);
 * - register a git repository: posts the repository URL to the `registerGitModule` action, and
 *   the store reads the repository's STORE.md and lists it as a git-backed module.
 *
 * Both actions enforce the upload permission server-side; we only gate the forms on being
 * logged in and on the repository existing in the rendered workspace. Both forms are client
 * islands: a plain <form> POST is rejected by Jahia's CsrfGuard ("Request Token does not
 * match Page Token"), so the submit must go through XMLHttpRequest.
 */
jahiaComponent(
  { nodeType: "jnt:fileUpload", name: "default", displayName: "Module upload", componentType: "view" },
  (_props: object, { renderContext, mainNode, jcrSession }) => {
    const { t } = useTranslation();
    if (!renderContext.isLoggedIn()) {
      return <p className={styles.note}>{t("upload.signInPrompt")}</p>;
    }

    const repoPath = `${renderContext.getSite().getPath()}/contents/modules-repository`;
    if (!jcrSession.nodeExists(repoPath)) {
      return <p className={styles.note}>{t("upload.repoUnavailable")}</p>;
    }

    const repoUrl = buildNodeUrl(jcrSession.getNode(repoPath)).replace(/\.html$/, "");
    const actionUrl = `${repoUrl}.createEntryFromJar.do`;
    const gitActionUrl = `${repoUrl}.registerGitModule.do`;
    const back = buildNodeUrl(mainNode);

    // Labels are built server-side and passed into the islands (survive hydration).
    const labels = {
      fileLabel: t("upload.fileLabel"),
      submit: t("upload.submit"),
      submitting: t("upload.submitting"),
      pickFile: t("upload.pickFile"),
      error: t("upload.error"),
    };
    const gitLabels = {
      urlLabel: t("upload.git.urlLabel"),
      submit: t("upload.git.submit"),
      submitting: t("upload.git.submitting"),
      missingUrl: t("upload.git.missingUrl"),
      error: t("upload.git.error"),
    };

    return (
      <>
        <Island component={FileUploadForm} props={{ actionUrl, backUrl: back, accept: ".jar,.tgz", labels }} />
        <p className={styles.note}>{t("upload.git.intro")}</p>
        <Island component={GitRepositoryForm} props={{ actionUrl: gitActionUrl, backUrl: back, labels: gitLabels }} />
      </>
    );
  },
);
