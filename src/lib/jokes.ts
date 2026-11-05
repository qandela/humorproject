export type Joke = {
  id: number;
  category: string;
  setup: string;
  punchline: string;
};

export type JokesResult =
  | { status: "success"; jokes: Joke[] }
  | { status: "unconfigured" | "error"; jokes: []; message: string };

export async function getJokes(): Promise<JokesResult> {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return {
      status: "unconfigured",
      jokes: [],
      message: "The joke collection is not connected yet. Please check back soon.",
    };
  }

  try {
    const endpoint = new URL("/rest/v1/jokes", url);
    endpoint.searchParams.set("select", "id,category,setup,punchline");
    endpoint.searchParams.set("order", "id.asc");
    const response = await fetch(endpoint, {
      headers: { apikey: anonKey },
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error("Database request failed");
    }

    const jokes: unknown = await response.json();
    if (!Array.isArray(jokes) || !jokes.every(isJoke)) {
      throw new Error("Unexpected database response");
    }

    return { status: "success", jokes };
  } catch {
    // Never send database error details or environment values to visitors.
    return {
      status: "error",
      jokes: [],
      message: "We could not load the jokes. Please try refreshing the page shortly.",
    };
  }
}

function isJoke(value: unknown): value is Joke {
  if (typeof value !== "object" || value === null) return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.id === "number" &&
    typeof row.category === "string" &&
    typeof row.setup === "string" &&
    typeof row.punchline === "string"
  );
}
