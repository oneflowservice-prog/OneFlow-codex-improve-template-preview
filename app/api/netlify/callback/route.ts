import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const returnTo =
    request.cookies.get("oneflow_netlify_oauth_return_to")?.value || "/";

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Connecting Netlify</title>
  </head>
  <body>
    <script>
      (async function () {
        const hash = new URLSearchParams(window.location.hash.slice(1));
        const payload = {
          accessToken: hash.get("access_token"),
          scope: hash.get("scope"),
          state: hash.get("state"),
        };
        const target = new URL(${JSON.stringify(returnTo)}, window.location.origin);

        if (!payload.accessToken || !payload.state) {
          target.searchParams.set("netlify", "error");
          target.searchParams.set("message", "Netlify did not return an access token.");
          window.location.replace(target.toString());
          return;
        }

        try {
          const response = await fetch("/api/netlify/callback/complete", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          });
          const result = await response.json().catch(() => null);
          if (!response.ok) {
            throw new Error(result && result.error ? result.error : "Failed to connect Netlify.");
          }
          target.searchParams.set("netlify", "connected");
        } catch (error) {
          target.searchParams.set("netlify", "error");
          target.searchParams.set(
            "message",
            error instanceof Error ? error.message : "Failed to connect Netlify.",
          );
        }

        window.location.replace(target.toString());
      })();
    </script>
  </body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
