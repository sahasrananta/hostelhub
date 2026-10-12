const configuredBase =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV ? "http://localhost:5000/api" : "/api");

export const API_BASE = configuredBase.replace(/\/+$/, "");
export const API_ORIGIN = API_BASE.startsWith("http")
  ? API_BASE.replace(/\/api$/, "")
  : (typeof window !== "undefined" ? window.location.origin : "");

export function apiUrl(path = "") {
  return `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
}

export function authHeaders(token = localStorage.getItem("hostelhub_token")) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function requestJson(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  const token = options.token ?? localStorage.getItem("hostelhub_token");

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (options.body && !(options.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(apiUrl(path), { ...options, headers });
  const rawText = await response.text();
  const data = rawText ? JSON.parse(rawText) : null;

  if (!response.ok) {
    throw new Error(data?.message || "Request failed");
  }

  return data;
}
