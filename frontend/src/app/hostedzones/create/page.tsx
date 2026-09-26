"use client";
import ConsoleLayout from "@/components/layout/ConsoleLayout";
import ZoneForm from "@/components/zones/ZoneForm";

export default function CreateHostedZonePage() {
  return (
    <ConsoleLayout
      contentType="form"
      breadcrumbs={[
        { text: "Hosted zones", href: "/hostedzones" },
        { text: "Create hosted zone", href: "/hostedzones/create" },
      ]}
    >
      <ZoneForm />
    </ConsoleLayout>
  );
}
