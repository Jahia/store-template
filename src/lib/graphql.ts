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
