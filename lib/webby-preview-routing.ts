export function getWebbyPreviewUpstreamPath(
  previewBasePath: string,
  requestPath = "/",
) {
  const normalizedBasePath = `/${previewBasePath}`
    .replace(/\/{2,}/g, "/")
    .replace(/\/$/, "");
  const normalizedRequestPath = `/${requestPath}`.replace(/\/{2,}/g, "/");

  return normalizedRequestPath === "/"
    ? normalizedBasePath
    : `${normalizedBasePath}${normalizedRequestPath}`;
}
