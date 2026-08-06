const UPTIMEHUB_API_BASE = "https://uptimehub.space/api";

export type UptimeHubMonitor = {
  id: number;
  project_id: number;
  name: string;
  type: string;
  target: string;
  port: number;
  settings: {
    check_interval_seconds: number;
    timeout_seconds: number;
    request_method: string;
    request_body: string;
    request_basic_auth_username: string;
    request_basic_auth_password: string;
    request_headers: Array<unknown>;
    response_status_code: number;
    response_body: string;
    response_headers: Array<unknown>;
  };
  ping_servers_ids: number[];
  is_ok: number;
  uptime: number;
  downtime: number;
  average_response_time: number;
  total_checks: number;
  total_ok_checks: number;
  total_not_ok_checks: number;
  last_check_datetime: string | null;
  notifications: {
    email_is_enabled: number;
    webhook: string;
    slack: string;
    twilio: string;
  };
  is_enabled: boolean;
  datetime: string;
};

type UptimeHubListResponse = {
  data?: UptimeHubMonitor[];
  meta?: {
    page: number;
    results_per_page: number;
    total: number;
    total_pages: number;
  };
};

function isUptimeHubListResponse(
  payload: UptimeHubListResponse | { message?: string } | null,
): payload is UptimeHubListResponse {
  return Boolean(
    payload &&
      typeof payload === "object" &&
      ("data" in payload || "meta" in payload),
  );
}

function getUptimeHubApiKey() {
  const apiKey = process.env.UPTIMEHUB_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("Missing UPTIMEHUB_API_KEY environment variable.");
  }

  return apiKey;
}

function normalizeTargetUrl(target: string) {
  try {
    const url = new URL(target.trim());
    url.hash = "";
    return url.toString();
  } catch {
    return target.trim();
  }
}

export function buildUptimeHubMonitorName(input: {
  userName?: string | null;
  userEmail?: string | null;
  siteName?: string | null;
  chatTitle?: string | null;
}) {
  const owner = input.userName?.trim() || input.userEmail?.trim() || "Unknown user";
  const site = input.siteName?.trim() || input.chatTitle?.trim() || "Deployment";

  return `${owner} - ${site}`;
}

async function uptimeHubFetch(
  pathname: string,
  init?: RequestInit,
) {
  const response = await fetch(`${UPTIMEHUB_API_BASE}${pathname}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${getUptimeHubApiKey()}`,
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });

  return response;
}

export async function listUptimeHubMonitors() {
  const monitors: UptimeHubMonitor[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const response = await uptimeHubFetch(
      `/monitors/?page=${page}&results_per_page=100`,
      {
        method: "GET",
      },
    );

    const payload = (await response.json().catch(() => null)) as
      | UptimeHubListResponse
      | { message?: string }
      | null;

    if (!response.ok) {
      throw new Error(
        (payload && "message" in payload && payload.message) ||
          "Could not load UptimeHub monitors.",
      );
    }

    if (isUptimeHubListResponse(payload)) {
      monitors.push(...(payload.data || []));
      totalPages = payload.meta?.total_pages || 1;
    }

    page += 1;
  } while (page <= totalPages);

  return monitors;
}

export async function createUptimeHubMonitor(input: {
  name: string;
  target: string;
}) {
  const formData = new FormData();
  formData.set("name", input.name.trim());
  formData.set("target", normalizeTargetUrl(input.target));

  const response = await uptimeHubFetch("/monitors", {
    method: "POST",
    body: formData,
  });

  const payload = (await response.json().catch(() => null)) as
    | { data?: { id?: number }; message?: string }
    | null;

  if (!response.ok || !payload?.data?.id) {
    throw new Error(payload?.message || "Could not create UptimeHub monitor.");
  }

  return payload.data.id;
}

export async function ensureUptimeHubMonitor(input: {
  name: string;
  target: string;
}) {
  const monitors = await listUptimeHubMonitors();
  const existing = isMonitorForTarget(monitors, input.target);

  if (existing) {
    return {
      created: false,
      id: existing.id,
      monitor: existing,
      monitors,
    };
  }

  const id = await createUptimeHubMonitor(input);
  const nextMonitors = await listUptimeHubMonitors();
  const createdMonitor = isMonitorForTarget(nextMonitors, input.target);

  return {
    created: true,
    id,
    monitor: createdMonitor,
    monitors: nextMonitors,
  };
}

export function isMonitorForTarget(
  monitors: UptimeHubMonitor[],
  target: string | null | undefined,
) {
  if (!target) {
    return null;
  }

  const normalizedTarget = normalizeTargetUrl(target);
  return (
    monitors.find(
      (monitor) => normalizeTargetUrl(monitor.target) === normalizedTarget,
    ) || null
  );
}
