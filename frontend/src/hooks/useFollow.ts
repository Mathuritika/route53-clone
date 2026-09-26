"use client";
// Cloudscape links/breadcrumbs fire onFollow; we route them through Next.js instead of a full reload.
import { useRouter } from "next/navigation";

export function useFollow() {
  const router = useRouter();
  return (e: CustomEvent<{ href?: string; external?: boolean }>) => {
    if (e.detail.external || !e.detail.href) return;
    e.preventDefault();
    router.push(e.detail.href);
  };
}
