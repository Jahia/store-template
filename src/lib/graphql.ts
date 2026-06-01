/**
 * Minimal GraphQL fetch for client islands — posts to Jahia's /modules/graphql
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
 * GraphQL multipart upload (graphql-multipart-request-spec) for a single File.
 * Jahia's `setValue(type: BINARY)` reads the binary from a multipart request
 * part, so a binary property MUST be uploaded this way — a base64 JSON value
 * fails with "Cannot read parts". The file is mapped to the `file` variable, so
 * the mutation should declare `$file: String!` and pass it to setValue. Like
 * gqlRequest this posts to /modules/graphql with the session cookie and is NOT
 * CSRF-gated. Browser-only (FormData/File).
 */
export async function gqlUpload<T = unknown>(
  query: string,
  variables: Record<string, unknown>,
  file: File,
  gqlUrl: string = "/modules/graphql",
): Promise<T> {
  const form = new FormData();
  form.append("operations", JSON.stringify({ query, variables: { ...variables, file: null } }));
  form.append("map", JSON.stringify({ "0": ["variables.file"] }));
  form.append("0", file, file.name);
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
