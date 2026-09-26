// The ONLY place that calls fetch(). Adds base URL + auth token and turns errors into ApiError.
import type { DnsRecord, HostedZone, ListParams, Page, User } from "./types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
export const TOKEN_KEY = "r53_token";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function request<T>(path: string, options: { method?: string; body?: unknown; raw?: boolean } = {}): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;
  const res = await fetch(`${BASE_URL}${path}`, {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (res.status === 401 && token) {
    // Session expired: tell AuthContext to log out
    window.dispatchEvent(new Event("r53:unauthorized"));
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(res.status, data.message || `Request failed (${res.status})`);
  }
  if (res.status === 204) return undefined as T;
  return (options.raw ? res.text() : res.json()) as Promise<T>;
}

function listQuery(p: ListParams): string {
  const q = new URLSearchParams({ page: String(p.page), page_size: String(p.pageSize) });
  if (p.search) q.set("search", p.search);
  if (p.type) q.set("type", p.type);
  return q.toString();
}

export const authApi = {
  login: (username: string, password: string) =>
    request<{ token: string; user: User }>("/api/auth/login", { method: "POST", body: { username, password } }),
  logout: () => request<void>("/api/auth/logout", { method: "POST" }),
  me: () => request<User>("/api/auth/me"),
};

export interface ZoneInput {
  name: string;
  zone_type: "public" | "private";
  comment: string;
  vpc_region?: string | null;
  vpc_id?: string | null;
}

export const zonesApi = {
  list: (p: ListParams) => request<Page<HostedZone>>(`/api/hosted-zones?${listQuery(p)}`),
  get: (id: string) => request<HostedZone>(`/api/hosted-zones/${id}`),
  create: (body: ZoneInput) => request<HostedZone>("/api/hosted-zones", { method: "POST", body }),
  update: (id: string, comment: string) =>
    request<HostedZone>(`/api/hosted-zones/${id}`, { method: "PATCH", body: { comment } }),
  remove: (id: string) => request<void>(`/api/hosted-zones/${id}`, { method: "DELETE" }),
  exportZone: (id: string, format: "json" | "bind") =>
    request<string>(`/api/hosted-zones/${id}/export?format=${format}`, { raw: true }),
  importZone: (id: string, zoneFile: string) =>
    request<{ created: number; skipped: string[] }>(`/api/hosted-zones/${id}/import`, {
      method: "POST",
      body: { zone_file: zoneFile },
    }),
};

export interface RecordInput {
  name: string;
  type: string;
  ttl: number;
  values: string[];
}

export const recordsApi = {
  list: (zoneId: string, p: ListParams) =>
    request<Page<DnsRecord>>(`/api/hosted-zones/${zoneId}/records?${listQuery(p)}`),
  get: (zoneId: string, id: number) => request<DnsRecord>(`/api/hosted-zones/${zoneId}/records/${id}`),
  create: (zoneId: string, body: RecordInput) =>
    request<DnsRecord>(`/api/hosted-zones/${zoneId}/records`, { method: "POST", body }),
  update: (zoneId: string, id: number, body: { ttl: number; values: string[] }) =>
    request<DnsRecord>(`/api/hosted-zones/${zoneId}/records/${id}`, { method: "PUT", body }),
  remove: (zoneId: string, id: number) =>
    request<void>(`/api/hosted-zones/${zoneId}/records/${id}`, { method: "DELETE" }),
  bulkDelete: (zoneId: string, ids: number[]) =>
    request<{ deleted: number }>(`/api/hosted-zones/${zoneId}/records/bulk-delete`, { method: "POST", body: { ids } }),
};
