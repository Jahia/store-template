import { buildNodeUrl, jahiaComponent, useServerContext } from "@jahia/javascript-modules-library";
import styles from "~/components/forge/upload.module.css";

/**
 * Module JAR upload form (jnt:fileUpload).
 *
 * A plain multipart form posting to the privateappstore `createEntryFromJar`
 * action on modules-repository — the one piece of authoring that stays a Java
 * action (it parses the JAR's package.json, runs a Maven deploy to the
 * configured forge, then creates the jnt:forgeModule + version nodes). The
 * action enforces the upload permission server-side; we only gate the form on
 * being logged in.
 */
jahiaComponent(
  { nodeType: "jnt:fileUpload", name: "default", displayName: "Module upload", componentType: "view" },
  (_props: object, { renderContext, mainNode, jcrSession }) => {
    if (!renderContext.isLoggedIn()) {
      return <p className={styles.note}>Please log in to submit a module.</p>;
    }

    const repoPath = `${renderContext.getSite().getPath()}/contents/modules-repository`;
    if (!jcrSession.nodeExists(repoPath)) {
      return <p className={styles.note}>The module repository is not available on this site.</p>;
    }

    const actionUrl = `${buildNodeUrl(jcrSession.getNode(repoPath)).replace(/\.html$/, "")}.createEntryFromJar.do`;
    const back = buildNodeUrl(mainNode);

    return (
      <form className={styles.upload} method="POST" action={actionUrl} encType="multipart/form-data">
        <div className={styles.field}>
          <label htmlFor="module-jar">Module package (.jar / .war)</label>
          <input id="module-jar" type="file" name="file" accept=".jar,.war" required />
        </div>
        <input type="hidden" name="redirectURL" value={back} />
        <input type="hidden" name="successRedirectUrl" value={back} />
        <button type="submit" className={styles.btn}>
          Upload module
        </button>
      </form>
    );
  },
);
