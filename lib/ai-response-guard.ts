import "server-only";

function looksLikeCloudflareChallenge(text: string) {
  return (
    text.includes("__CF$cv$params") ||
    text.includes("/cdn-cgi/challenge-platform/") ||
    text.includes("cf-browser-verification") ||
    /just a moment/i.test(text)
  );
}

export function isEventStreamResponse(response: Response) {
  return (response.headers.get("content-type") || "")
    .toLowerCase()
    .includes("text/event-stream");
}

export async function upstreamErrorResponse(
  provider: string,
  response: Response,
  fallbackMessage: string,
) {
  const body = await response.text().catch(() => "");
  const message = looksLikeCloudflareChallenge(body)
    ? `${provider} returned a Cloudflare challenge instead of an AI stream. Check the provider endpoint, proxy, VPN, firewall, or Cloudflare bot protection settings.`
    : body || fallbackMessage;

  // Server-side log so the real upstream error appears in server logs
  console.error(
    `[ai-response-guard] ${provider} upstream error ${response.status}: ${message}`,
  );

  return new Response(message, {
    status: response.ok ? 502 : response.status,
  });
}
