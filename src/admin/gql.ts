import { useCallback, useEffect, useState } from "react";

/**
 * Minimal GraphQL client for the admin islands.
 *
 * Plain fetch to Jahia's /modules/graphql with the browser session cookie —
 * the engine-idiomatic approach (Apollo Client is unusable here: its SSR build
 * imports node:module, which GraalVM rejects at server-bundle init). The
 * fetch only runs client-side (inside useEffect / event handlers), so it never
 * executes during GraalVM SSR.
 */
const DEFAULT_GQL_URL = "/modules/graphql";

export async function gqlRequest<T = unknown>(
  query: string,
  variables: Record<string, unknown> = {},
  gqlUrl: string = DEFAULT_GQL_URL,
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

export interface GqlQueryResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/** Runs a query on mount (and whenever the variables change), with a refetch(). */
export function useGqlQuery<T = unknown>(
  query: string,
  variables: Record<string, unknown>,
  gqlUrl?: string,
): GqlQueryResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const variablesKey = JSON.stringify(variables);

  const run = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await gqlRequest<T>(query, JSON.parse(variablesKey), gqlUrl));
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [query, variablesKey, gqlUrl]);

  useEffect(() => {
    run();
  }, [run]);

  return { data, loading, error, refetch: run };
}
