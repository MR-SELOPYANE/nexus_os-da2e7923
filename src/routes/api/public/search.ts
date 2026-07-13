import { createFileRoute } from "@tanstack/react-router";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0 Safari/537.36";

interface Result {
  title: string;
  url: string;
  snippet: string;
}

function stripTags(html: string): string {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

// Brave Search HTML (no API key)
async function braveSearch(query: string): Promise<Result[]> {
  const url = `https://search.brave.com/search?q=${encodeURIComponent(query)}&source=web`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": UA,
      Accept: "text/html",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });
  const html = await res.text();
  const results: Result[] = [];
  // Brave results: <div class="snippet ..."> containing <a href="..."> with title/desc
  const re = /<a[^>]+class="[^"]*heading-serpresult[^"]*"[^>]*href="([^"]+)"[\s\S]*?<div[^>]+class="[^"]*title[^"]*"[^>]*>([\s\S]*?)<\/div>[\s\S]*?<div[^>]+class="[^"]*snippet-description[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null && results.length < 15) {
    results.push({
      url: m[1],
      title: stripTags(m[2]),
      snippet: stripTags(m[3]),
    });
  }
  // Fallback simple pattern
  if (results.length === 0) {
    const re2 = /<a[^>]+href="(https?:\/\/[^"]+)"[^>]*>([^<]{6,120})<\/a>/gi;
    const seen = new Set<string>();
    let m2: RegExpExecArray | null;
    while ((m2 = re2.exec(html)) !== null && results.length < 10) {
      const u = m2[1];
      if (seen.has(u)) continue;
      if (/brave\.com|search\.brave/.test(u)) continue;
      seen.add(u);
      results.push({ url: u, title: stripTags(m2[2]), snippet: "" });
    }
  }
  return results;
}

async function handle(request: Request) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim();
  if (!q) return Response.json({ results: [] }, { headers: corsHeaders });
  try {
    const results = await braveSearch(q);
    return Response.json(
      { query: q, results },
      { headers: { ...corsHeaders, "Cache-Control": "public, max-age=60" } }
    );
  } catch (e) {
    return Response.json(
      { error: (e as Error).message, results: [] },
      { status: 502, headers: corsHeaders }
    );
  }
}

export const Route = createFileRoute("/api/public/search")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),
      GET: async ({ request }) => handle(request),
    },
  },
});
