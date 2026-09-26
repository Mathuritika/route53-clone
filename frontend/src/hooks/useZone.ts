"use client";
// Load one hosted zone by id (used by detail, edit and record pages).
import { useCallback, useEffect, useState } from "react";
import { zonesApi } from "@/lib/api";
import type { HostedZone } from "@/lib/types";

export function useZone(id: string) {
  const [zone, setZone] = useState<HostedZone | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    zonesApi.get(id).then(setZone).catch((e) => setError(e.message));
  }, [id]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { zone, error, reload };
}
