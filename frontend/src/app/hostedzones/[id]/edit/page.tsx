"use client";
import { useParams } from "next/navigation";
import ConsoleLayout from "@/components/layout/ConsoleLayout";
import PageState from "@/components/ui/PageState";
import ZoneForm from "@/components/zones/ZoneForm";
import { useZone } from "@/hooks/useZone";

export default function EditHostedZonePage() {
  const { id } = useParams<{ id: string }>();
  const { zone, error } = useZone(id);

  return (
    <ConsoleLayout
      contentType="form"
      breadcrumbs={[
        { text: "Hosted zones", href: "/hostedzones" },
        { text: zone?.name ?? id, href: `/hostedzones/${id}` },
        { text: "Edit hosted zone", href: `/hostedzones/${id}/edit` },
      ]}
    >
      {zone ? <ZoneForm zone={zone} /> : <PageState error={error} />}
    </ConsoleLayout>
  );
}
