"use client";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import ConsoleLayout from "@/components/layout/ConsoleLayout";
import RecordForm from "@/components/records/RecordForm";
import PageState from "@/components/ui/PageState";
import { useZone } from "@/hooks/useZone";
import { recordsApi } from "@/lib/api";
import type { DnsRecord } from "@/lib/types";

export default function EditRecordPage() {
  const { id, recordId } = useParams<{ id: string; recordId: string }>();
  const { zone, error: zoneError } = useZone(id);
  const [record, setRecord] = useState<DnsRecord | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    recordsApi.get(id, Number(recordId)).then(setRecord).catch((e) => setError(e.message));
  }, [id, recordId]);

  return (
    <ConsoleLayout
      contentType="form"
      breadcrumbs={[
        { text: "Hosted zones", href: "/hostedzones" },
        { text: zone?.name ?? id, href: `/hostedzones/${id}` },
        { text: "Edit record", href: `/hostedzones/${id}/records/${recordId}/edit` },
      ]}
    >
      {zone && record ? <RecordForm zone={zone} record={record} /> : <PageState error={zoneError ?? error} />}
    </ConsoleLayout>
  );
}
