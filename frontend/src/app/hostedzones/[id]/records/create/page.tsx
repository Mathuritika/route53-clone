"use client";
import { useParams } from "next/navigation";
import ConsoleLayout from "@/components/layout/ConsoleLayout";
import RecordForm from "@/components/records/RecordForm";
import PageState from "@/components/ui/PageState";
import { useZone } from "@/hooks/useZone";

export default function CreateRecordPage() {
  const { id } = useParams<{ id: string }>();
  const { zone, error } = useZone(id);

  return (
    <ConsoleLayout
      contentType="form"
      breadcrumbs={[
        { text: "Hosted zones", href: "/hostedzones" },
        { text: zone?.name ?? id, href: `/hostedzones/${id}` },
        { text: "Create record", href: `/hostedzones/${id}/records/create` },
      ]}
    >
      {zone ? <RecordForm zone={zone} /> : <PageState error={error} />}
    </ConsoleLayout>
  );
}
