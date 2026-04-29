import type { QueryRequest, QueryResponse } from "./types";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? import.meta.env.BASE_URL;

export async function buildQuery(req: QueryRequest): Promise<QueryResponse> {
  const res = await fetch(`${BASE_URL}query/build`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Unknown error" }));
    throw err;
  }

  return res.json();
}
