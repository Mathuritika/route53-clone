// TypeScript types mirroring the backend Pydantic schemas (app/schemas/*.py)

export interface User {
  id: number;
  username: string;
  account_id: string;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export type ZoneType = "public" | "private";

export interface HostedZone {
  id: string;
  name: string;
  zone_type: ZoneType;
  comment: string;
  vpc_region: string | null;
  vpc_id: string | null;
  record_count: number;
  name_servers: string[];
  created_at: string;
}

export interface DnsRecord {
  id: number;
  zone_id: string;
  name: string;
  type: string;
  ttl: number;
  values: string[];
  routing_policy: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface ListParams {
  search: string;
  type: string;
  page: number;
  pageSize: number;
}
