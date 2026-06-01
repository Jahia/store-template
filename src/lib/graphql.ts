/**
 * Minimal GraphQL fetch for client islands - posts to Jahia's /modules/graphql
 * with the browser session cookie, so calls run as the logged-in user and JCR
 * ACLs apply. (Apollo is unusable here: its SSR build imports node:module which
 * GraalVM rejects; this fetch only runs client-side anyway.)
 */
export async function gqlRequest<T = unknown>(
  query: string,
  variables: Record<string, unknown> = {},
  gqlUrl: string = "/modules/graphql",
): Promise<T> {
  const res = await fetch(gqlUrl, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) {
    throw new Error(`GraphQL HTTP ${res.status} ${res.statusText}`);
  }
  const json = await res.json();
  if (json.errors && json.errors.length > 0) {
    throw new Error(json.errors[0].message || "GraphQL error");
  }
  return json.data as T;
}

/**
 * GraphQL multipart upload for a single File, using Jahia's OWN convention - NOT
 * the apollo-upload graphql-multipart-request-spec (`operations`/`map`/`0`), which
 * Jahia does not parse. With that spec the `$file` argument ends up bound to the
 * servlet Part's toString() (e.g. "org.apache.catalina.core.ApplicationPart@…"),
 * which is then stored verbatim as the BINARY value → a corrupt image.
 *
 * Jahia's GraphQL servlet reads `query` / `variables` as plain multipart form
 * fields and resolves a `setValue(type: BINARY, value: $file)` whose value is a
 * string by looking up the request part with that exact name. So: append the File
 * under a unique part name, set the `file` variable to that same name, and send
 * `query` + `variables` as form fields. Mirrors @jahia/cypress `uploadFile` (same
 * `$file: String!` + `setValue(type: BINARY, value: $file)` mutation shape). A
 * base64 JSON value instead fails with "Cannot read parts".
 *
 * Browser-only (FormData/File). Posts to /modules/graphql with the session
 * cookie and is NOT CSRF-gated.
 */
export async function gqlUpload<T = unknown>(
  query: string,
  variables: Record<string, unknown>,
  file: File,
  gqlUrl: string = "/modules/graphql",
): Promise<T> {
  // Unique part name that the BINARY setValue resolves its stream from.
  const partName = `file_${Math.random().toString(36).slice(2)}`;
  const form = new FormData();
  form.append("query", query);
  form.append("variables", JSON.stringify({ ...variables, file: partName }));
  form.append(partName, file, file.name);
  // No Content-Type header: the browser sets the multipart boundary.
  const res = await fetch(gqlUrl, {
    method: "POST",
    credentials: "same-origin",
    headers: { Accept: "application/json" },
    body: form,
  });
  if (!res.ok) {
    throw new Error(`GraphQL HTTP ${res.status} ${res.statusText}`);
  }
  const json = await res.json();
  if (json.errors && json.errors.length > 0) {
    throw new Error(json.errors[0].message || "GraphQL error");
  }
  return json.data as T;
}
