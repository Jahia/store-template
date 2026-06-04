import { buildNodeUrl, Island, jahiaComponent } from "@jahia/javascript-modules-library";
import { useTranslation } from "react-i18next";
import styles from "~/components/forge/upload.module.css";
import FileUploadForm from "./FileUpload.client";

/**
 * Module JAR upload form (jnt:fileUpload).
 *
 * The actual upload posts (multipart) to the jahia-store `createEntryFromJar`
 * action on modules-repository - the one piece of authoring that stays a Java
 * action (it parses the JAR's package.json, runs a Maven deploy to the configured
 * forge, then creates the jnt:forgeModule + version nodes). The action enforces the
 * upload permission server-side; we only gate the form on being logged in and on
 * the repository existing in the rendered workspace.
 *
 * The form itself is a client island ({@link FileUploadForm}): a plain <form> POST
 * is rejected by Jahia's CsrfGuard ("Request Token does not match Page Token"), so
 * the submit must go through XMLHttpRequest - the same reason reviews post via XHR.
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

    const actionUrl = `${buildNodeUrl(jcrSession.getNode(repoPath)).replace(/\.html$/, "")}.createEntryFromJar.do`;
    const back = buildNodeUrl(mainNode);

    // Labels are built server-side and passed into the island (survive hydration).
    const labels = {
      fileLabel: t("upload.fileLabel"),
      submit: t("upload.submit"),
      submitting: t("upload.submitting"),
      pickFile: t("upload.pickFile"),
      error: t("upload.error"),
    };

    return (
      <Island
        component={FileUploadForm}
        props={{ actionUrl, backUrl: back, accept: ".jar,.war", labels }}
      />
    );
  },
);
