import type { QueryRequest, QueryResponse } from "./types";

export async function buildQuery(req: QueryRequest): Promise<QueryResponse> {
  const res = await fetch("/query/build", {
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
