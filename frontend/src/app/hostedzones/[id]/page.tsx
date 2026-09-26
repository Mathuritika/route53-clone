"use client";
// Hosted zone details: summary + tabs (Records, DNSSEC, Tags) + export/delete/edit actions.
import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import ButtonDropdown from "@cloudscape-design/components/button-dropdown";
import ColumnLayout from "@cloudscape-design/components/column-layout";
import ExpandableSection from "@cloudscape-design/components/expandable-section";
import Header from "@cloudscape-design/components/header";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Tabs from "@cloudscape-design/components/tabs";
import { useParams, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import ConsoleLayout from "@/components/layout/ConsoleLayout";
import RecordsTable from "@/components/records/RecordsTable";
import DeleteModal from "@/components/ui/DeleteModal";
import PageState from "@/components/ui/PageState";
import { useNotifications } from "@/context/NotificationContext";
import { useZone } from "@/hooks/useZone";
import { zonesApi } from "@/lib/api";
import { downloadText } from "@/lib/download";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <Box variant="awsui-key-label">{label}</Box>
      <div>{children}</div>
    </div>
  );
}

const placeholderTab = (text: string) => (
  <Box textAlign="center" padding="xl" color="text-body-secondary">{text} is coming soon.</Box>
);

export default function HostedZoneDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const notify = useNotifications();
  const { zone, error, reload } = useZone(id);
  const [showDelete, setShowDelete] = useState(false);

  const breadcrumbs = [
    { text: "Hosted zones", href: "/hostedzones" },
    { text: zone?.name ?? id, href: `/hostedzones/${id}` },
  ];

  if (!zone) {
    return <ConsoleLayout breadcrumbs={breadcrumbs}><PageState error={error} /></ConsoleLayout>;
  }

  const exportZone = async (format: "json" | "bind") => {
    try {
      const text = await zonesApi.exportZone(zone.id, format);
      const base = zone.name.replace(/\.$/, "");
      if (format === "json") downloadText(`${base}.json`, JSON.stringify(JSON.parse(text), null, 2), "application/json");
      else downloadText(`${base}.zone`, text);
    } catch (e) {
      notify.error((e as Error).message);
    }
  };

  const deleteZone = async () => {
    await zonesApi.remove(zone.id);
    notify.success(`Hosted zone ${zone.name} was successfully deleted.`);
    router.push("/hostedzones");
  };

  return (
    <ConsoleLayout breadcrumbs={breadcrumbs}>
      <SpaceBetween size="l">
        <Header
          variant="h1"
          info={<Box color="text-status-info" fontSize="body-s">Info</Box>}
          actions={
            <SpaceBetween direction="horizontal" size="xs">
              <Button onClick={() => setShowDelete(true)}>Delete zone</Button>
              <ButtonDropdown
                items={[
                  { id: "json", text: "Export as JSON" },
                  { id: "bind", text: "Export as BIND zone file" },
                ]}
                onItemClick={({ detail }) => exportZone(detail.id as "json" | "bind")}
              >
                Export
              </ButtonDropdown>
              <Button onClick={() => router.push(`/hostedzones/${zone.id}/edit`)}>Edit hosted zone</Button>
            </SpaceBetween>
          }
        >
          {zone.name.replace(/\.$/, "")}
        </Header>

        <ExpandableSection variant="container" headerText="Hosted zone details" defaultExpanded>
          <ColumnLayout columns={3} variant="text-grid">
            <SpaceBetween size="l">
              <Field label="Hosted zone name">{zone.name}</Field>
              <Field label="Hosted zone ID">{zone.id}</Field>
              <Field label="Description">{zone.comment || "-"}</Field>
            </SpaceBetween>
            <SpaceBetween size="l">
              <Field label="Type">{zone.zone_type === "public" ? "Public hosted zone" : "Private hosted zone"}</Field>
              <Field label="Record count">{zone.record_count}</Field>
              {zone.zone_type === "private" && <Field label="VPC">{zone.vpc_id} ({zone.vpc_region})</Field>}
              <Field label="Query log">-</Field>
            </SpaceBetween>
            <Field label="Name servers">
              {zone.name_servers.map((ns) => <div key={ns}>{ns}</div>)}
            </Field>
          </ColumnLayout>
        </ExpandableSection>

        <Tabs
          tabs={[
            { id: "records", label: `Records (${zone.record_count})`, content: <RecordsTable zone={zone} onChanged={reload} /> },
            { id: "dnssec", label: "DNSSEC signing", content: placeholderTab("DNSSEC signing") },
            { id: "tags", label: "Hosted zone tags (0)", content: placeholderTab("Hosted zone tags") },
          ]}
        />
      </SpaceBetween>

      <DeleteModal
        visible={showDelete}
        title={`Delete ${zone.name}`}
        confirmWord="delete"
        onCancel={() => setShowDelete(false)}
        onConfirm={deleteZone}
      >
        <Box>
          Deleting the hosted zone <b>{zone.name}</b> is permanent. You must first delete all records except
          the default NS and SOA records.
        </Box>
      </DeleteModal>
    </ConsoleLayout>
  );
}
