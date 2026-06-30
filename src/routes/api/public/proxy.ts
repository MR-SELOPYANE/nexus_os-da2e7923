import { createFileRoute } from "@tanstack/react-router";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0 Safari/537.36";

function absolutize(base: URL, ref: string): string {
  try {
    return new URL(ref, base).toString();
  } catch {
    return ref;
  }
}

function proxified(absUrl: string, mode: string): string {
  return `/api/public/proxy?mode=${encodeURIComponent(mode)}&url=${encodeURIComponent(absUrl)}`;
}

function rewriteHtml(html: string, baseUrl: URL, mode: string): string {
  // Strip CSP/frame meta + script-injected blockers
  html = html
    .replace(/<meta[^>]+http-equiv=["']?(content-security-policy|x-frame-options)["']?[^>]*>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<iframe([^>]*)>/gi, "<iframe$1 sandbox=\"\">");

  // Inject <base> so relative asset URLs resolve to the real origin
  const baseTag = `<base href="${baseUrl.origin}${baseUrl.pathname.replace(/[^/]*$/, "")}">`;
  if (/<head[^>]*>/i.test(html)) {
    html = html.replace(/<head([^>]*)>/i, `<head$1>${baseTag}`);
  } else {
    html = baseTag + html;
  }

  // Rewrite anchor hrefs to keep navigation inside the proxy
  html = html.replace(/<a\b([^>]*?)href=["']([^"']+)["']([^>]*)>/gi, (_m, pre, href, post) => {
    if (/^(javascript|mailto|tel|#)/i.test(href)) return `<a${pre}href="${href}"${post}>`;
    const abs = absolutize(baseUrl, href);
    return `<a${pre}href="${proxified(abs, mode)}"${post} target="_top">`;
  });

  // Rewrite form actions through the proxy
  html = html.replace(/<form\b([^>]*?)action=["']([^"']+)["']([^>]*)>/gi, (_m, pre, action, post) => {
    const abs = absolutize(baseUrl, action);
    return `<form${pre}action="${proxified(abs, mode)}"${post}>`;
  });

  return html;
}

function extractReader(html: string, baseUrl: URL): { title: string; body: string } {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : baseUrl.hostname;

  // Strip noise
  let cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<header[\s\S]*?<\/header>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<aside[\s\S]*?<\/aside>/gi, "")
    .replace(/<form[\s\S]*?<\/form>/gi, "");

  // Prefer <article>, then <main>, then body
  const article = cleaned.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
  const main = cleaned.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  let body = article ? article[1] : main ? main[1] : cleaned.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? cleaned;

  // Strip class/style/id/on* attrs
  body = body.replace(/\s(class|style|id|on\w+)=["'][^"']*["']/gi, "");

  // Absolutize images and anchors
  body = body.replace(/<img\b([^>]*?)src=["']([^"']+)["']([^>]*)>/gi, (_m, pre, src, post) => {
    return `<img${pre}src="${absolutize(baseUrl, src)}"${post}>`;
  });
  body = body.replace(/<a\b([^>]*?)href=["']([^"']+)["']([^>]*)>/gi, (_m, pre, href, post) => {
    if (/^(javascript|mailto|tel|#)/i.test(href)) return `<a${pre}href="${href}"${post}>`;
    return `<a${pre}href="${proxified(absolutize(baseUrl, href), "reader")}"${post} target="_top">`;
  });

  return { title, body };
}

const READER_TEMPLATE = (title: string, host: string, body: string, originalUrl: string) => `<!doctype html>
<html><head><meta charset="utf-8"><title>${title}</title>
<style>
  :root { color-scheme: dark; }
  body { margin: 0; background: #0c1118; color: #e5e7eb; font: 16px/1.65 ui-serif, Georgia, serif; }
  .wrap { max-width: 720px; margin: 0 auto; padding: 48px 24px 80px; }
  .meta { font-family: ui-sans-serif, system-ui; font-size: 12px; color: #94a3b8; margin-bottom: 24px; }
  .meta a { color: #38bdf8; }
  h1, h2, h3, h4 { font-family: ui-sans-serif, system-ui; line-height: 1.25; color: #f8fafc; }
  h1 { font-size: 32px; margin: 0 0 16px; }
  a { color: #7dd3fc; }
  img { max-width: 100%; height: auto; border-radius: 8px; margin: 16px 0; }
  pre, code { background: #1e293b; border-radius: 6px; }
  pre { padding: 12px; overflow-x: auto; }
  code { padding: 2px 6px; font-size: 0.9em; }
  blockquote { border-left: 3px solid #475569; margin: 16px 0; padding: 4px 16px; color: #cbd5e1; }
  p { margin: 12px 0; }
</style></head>
<body><div class="wrap">
  <div class="meta">Reader view · <a href="${originalUrl}" target="_blank" rel="noreferrer">${host}</a></div>
  <h1>${title}</h1>
  ${body}
</div></body></html>`;

async function handle(request: Request) {
  const reqUrl = new URL(request.url);
  const target = reqUrl.searchParams.get("url");
  const mode = reqUrl.searchParams.get("mode") === "reader" ? "reader" : "raw";
  if (!target) return new Response("Missing url", { status: 400, headers: corsHeaders });

  let parsed: URL;
  try {
    parsed = new URL(target);
  } catch {
    return new Response("Invalid url", { status: 400, headers: corsHeaders });
  }
  if (!/^https?:$/.test(parsed.protocol)) {
    return new Response("Only http(s) allowed", { status: 400, headers: corsHeaders });
  }

  let upstream: Response;
  try {
    upstream = await fetch(parsed.toString(), {
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
    });
  } catch (e) {
    return new Response(`Fetch failed: ${(e as Error).message}`, { status: 502, headers: corsHeaders });
  }

  const contentType = upstream.headers.get("content-type") ?? "application/octet-stream";

  // Pass-through non-HTML (images, css, etc.) — stripped of frame-blocking headers
  if (!/text\/html|application\/xhtml/i.test(contentType)) {
    const buf = await upstream.arrayBuffer();
    return new Response(buf, {
      status: upstream.status,
      headers: { ...corsHeaders, "Content-Type": contentType, "Cache-Control": "public, max-age=300" },
    });
  }

  const html = await upstream.text();
  const finalUrl = new URL(upstream.url || parsed.toString());

  if (mode === "reader") {
    const { title, body } = extractReader(html, finalUrl);
    const page = READER_TEMPLATE(title, finalUrl.hostname, body, finalUrl.toString());
    return new Response(page, {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
    });
  }

  const rewritten = rewriteHtml(html, finalUrl, "raw");
  return new Response(rewritten, {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
  });
}

export const Route = createFileRoute("/api/public/proxy")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),
      GET: async ({ request }) => handle(request),
      POST: async ({ request }) => handle(request),
    },
  },
});
