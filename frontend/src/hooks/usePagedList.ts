"use client";
// Shared by the hosted zones table and the records table:
// debounced search + type filter + server-side pagination.
import { useCallback, useEffect, useRef, useState } from "react";
import type { ListParams, Page } from "@/lib/types";

export function usePagedList<T>(fetchPage: (params: ListParams) => Promise<Page<T>>) {
  const [filterText, setFilterText] = useState(""); // what the user is typing
  const [search, setSearch] = useState("");         // what we actually send (after 300ms)
  const [type, setTypeState] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(10);
  const [items, setItems] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRef = useRef(fetchPage);
  fetchRef.current = fetchPage;
  const requestId = useRef(0);

  // Debounce: only search after the user stops typing for 300ms
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(filterText);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [filterText]);

  const reload = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);
    try {
      const res = await fetchRef.current({ search, type, page, pageSize });
      if (id !== requestId.current) return; // a newer request already started
      // If we deleted the last item of the last page, step back one page
      if (res.items.length === 0 && page > 1) {
        setPage(page - 1);
        return;
      }
      setItems(res.items);
      setTotal(res.total);
      setError(null);
    } catch (e) {
      if (id === requestId.current) setError((e as Error).message);
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [search, type, page, pageSize]);

  useEffect(() => {
    reload();
  }, [reload]);

  return {
    items, total, loading, error, reload,
    filterText, setFilterText,
    type, setType: (t: string) => { setTypeState(t); setPage(1); },
    page, setPage,
    pageSize, setPageSize: (s: number) => { setPageSizeState(s); setPage(1); },
    pagesCount: Math.max(1, Math.ceil(total / pageSize)),
  };
}
