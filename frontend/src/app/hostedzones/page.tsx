"use client";
// Hosted zones list: search, type filter, pagination, single select, view / edit / delete / create.
import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import CollectionPreferences from "@cloudscape-design/components/collection-preferences";
import Header from "@cloudscape-design/components/header";
import Link from "@cloudscape-design/components/link";
import Pagination from "@cloudscape-design/components/pagination";
import Select from "@cloudscape-design/components/select";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Table, { type TableProps } from "@cloudscape-design/components/table";
import TextFilter from "@cloudscape-design/components/text-filter";
import { useRouter } from "next/navigation";
import { useState } from "react";
import ConsoleLayout from "@/components/layout/ConsoleLayout";
import DeleteModal from "@/components/ui/DeleteModal";
import { useNotifications } from "@/context/NotificationContext";
import { useFollow } from "@/hooks/useFollow";
import { usePagedList } from "@/hooks/usePagedList";
import { zonesApi } from "@/lib/api";
import type { HostedZone } from "@/lib/types";

const TYPE_FILTER = [
  { label: "All types", value: "" },
  { label: "Public", value: "public" },
  { label: "Private", value: "private" },
];

export default function HostedZonesPage() {
  const router = useRouter();
  const follow = useFollow();
  const notify = useNotifications();
  const list = usePagedList<HostedZone>(zonesApi.list);
  const [selected, setSelected] = useState<HostedZone[]>([]);
  const [showDelete, setShowDelete] = useState(false);
  const zone = selected[0];

  const columns: TableProps.ColumnDefinition<HostedZone>[] = [
    {
      id: "name", header: "Hosted zone name", isRowHeader: true,
      cell: (z) => <Link href={`/hostedzones/${z.id}`} onFollow={follow}>{z.name}</Link>,
    },
    { id: "type", header: "Type", cell: (z) => (z.zone_type === "public" ? "Public" : "Private") },
    { id: "createdBy", header: "Created by", cell: () => "Route 53" },
    { id: "count", header: "Record count", cell: (z) => z.record_count },
    { id: "comment", header: "Description", cell: (z) => z.comment || <Box color="text-body-secondary">-</Box> },
    { id: "id", header: "Hosted zone ID", cell: (z) => z.id },
  ];

  const deleteZone = async () => {
    await zonesApi.remove(zone.id); // 409 if zone still has records -> shown inside the modal
    notify.success(`Hosted zone ${zone.name} was successfully deleted.`);
    setShowDelete(false);
    setSelected([]);
    list.reload();
  };

  return (
    <ConsoleLayout breadcrumbs={[{ text: "Hosted zones", href: "/hostedzones" }]} contentType="table">
      <Table
        variant="full-page"
        items={list.items}
        columnDefinitions={columns}
        trackBy="id"
        loading={list.loading}
        loadingText="Loading hosted zones"
        selectionType="single"
        selectedItems={selected}
        onSelectionChange={({ detail }) => setSelected(detail.selectedItems)}
        ariaLabels={{ selectionGroupLabel: "Hosted zone selection", itemSelectionLabel: (_, z) => z.name }}
        header={
          <Header
            variant="awsui-h1-sticky"
            counter={`(${list.total})`}
            description="Automatic mode is the current search behavior optimized for best filter results."
            actions={
              <SpaceBetween direction="horizontal" size="xs">
                <Button iconName="refresh" ariaLabel="Refresh" onClick={() => list.reload()} />
                <Button disabled={!zone} onClick={() => router.push(`/hostedzones/${zone.id}`)}>View details</Button>
                <Button disabled={!zone} onClick={() => router.push(`/hostedzones/${zone.id}/edit`)}>Edit</Button>
                <Button disabled={!zone} onClick={() => setShowDelete(true)}>Delete</Button>
                <Button variant="primary" onClick={() => router.push("/hostedzones/create")}>Create hosted zone</Button>
              </SpaceBetween>
            }
          >
            Hosted zones
          </Header>
        }
        filter={
          <div className="r53-filters">
            <TextFilter
              filteringText={list.filterText}
              filteringPlaceholder="Filter hosted zones by property or value"
              filteringAriaLabel="Filter hosted zones"
              onChange={({ detail }) => list.setFilterText(detail.filteringText)}
              countText={`${list.total} matches`}
            />
            <Select
              selectedOption={TYPE_FILTER.find((o) => o.value === list.type) ?? TYPE_FILTER[0]}
              options={TYPE_FILTER}
              onChange={({ detail }) => list.setType(detail.selectedOption.value!)}
              ariaLabel="Filter by type"
            />
          </div>
        }
        pagination={
          <Pagination currentPageIndex={list.page} pagesCount={list.pagesCount} onChange={({ detail }) => list.setPage(detail.currentPageIndex)} />
        }
        preferences={
          <CollectionPreferences
            title="Preferences"
            confirmLabel="Confirm"
            cancelLabel="Cancel"
            preferences={{ pageSize: list.pageSize }}
            pageSizePreference={{ title: "Page size", options: [10, 20, 50].map((v) => ({ value: v, label: `${v} hosted zones` })) }}
            onConfirm={({ detail }) => list.setPageSize(detail.pageSize ?? 10)}
          />
        }
        empty={
          <Box textAlign="center" color="inherit" padding="l">
            <SpaceBetween size="m">
              <b>No hosted zones</b>
              <Box color="inherit">{list.error ?? "You don't have any hosted zones that match."}</Box>
              <Button onClick={() => router.push("/hostedzones/create")}>Create hosted zone</Button>
            </SpaceBetween>
          </Box>
        }
      />

      <DeleteModal
        visible={showDelete}
        title={`Delete ${zone?.name ?? ""}`}
        confirmWord="delete"
        onCancel={() => setShowDelete(false)}
        onConfirm={deleteZone}
      >
        <Box>
          Deleting the hosted zone <b>{zone?.name}</b> is permanent. You can only delete a hosted zone that
          contains nothing but the default NS and SOA records.
        </Box>
      </DeleteModal>
    </ConsoleLayout>
  );
}
