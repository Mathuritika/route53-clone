"use client";
// Records tab of a hosted zone: search, type filter, pagination, multi-select, bulk delete, import.
import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import CollectionPreferences from "@cloudscape-design/components/collection-preferences";
import Header from "@cloudscape-design/components/header";
import Pagination from "@cloudscape-design/components/pagination";
import Select from "@cloudscape-design/components/select";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Table, { type TableProps } from "@cloudscape-design/components/table";
import TextFilter from "@cloudscape-design/components/text-filter";
import { useRouter } from "next/navigation";
import { useState } from "react";
import DeleteModal from "@/components/ui/DeleteModal";
import { useNotifications } from "@/context/NotificationContext";
import { usePagedList } from "@/hooks/usePagedList";
import { recordsApi } from "@/lib/api";
import { RECORD_TYPES } from "@/lib/recordTypes";
import type { DnsRecord, HostedZone } from "@/lib/types";
import ImportModal from "./ImportModal";

const TYPE_FILTER = [{ label: "All record types", value: "" }, ...["SOA", ...RECORD_TYPES.map((t) => t.value)].sort().map((t) => ({ label: t, value: t }))];

const dash = <Box color="text-body-secondary">-</Box>;

const COLUMNS: TableProps.ColumnDefinition<DnsRecord>[] = [
  { id: "name", header: "Record name", cell: (r) => r.name, isRowHeader: true, minWidth: 200 },
  { id: "type", header: "Type", cell: (r) => r.type },
  { id: "routing", header: "Routing policy", cell: (r) => r.routing_policy },
  { id: "diff", header: "Differentiator", cell: () => dash },
  { id: "alias", header: "Alias", cell: () => "No" },
  { id: "value", header: "Value/Route traffic to", cell: (r) => <div className="r53-values">{r.values.map((v) => <div key={v}>{v}</div>)}</div>, minWidth: 320 },
  { id: "ttl", header: "TTL (seconds)", cell: (r) => r.ttl },
  { id: "health", header: "Health check ID", cell: () => dash },
  { id: "evaluate", header: "Evaluate target health", cell: () => dash },
  { id: "recordId", header: "Record ID", cell: () => dash },
];

export default function RecordsTable({ zone, onChanged }: { zone: HostedZone; onChanged: () => void }) {
  const router = useRouter();
  const notify = useNotifications();
  const list = usePagedList<DnsRecord>((p) => recordsApi.list(zone.id, p));
  const [selected, setSelected] = useState<DnsRecord[]>([]);
  const [showDelete, setShowDelete] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const refresh = () => {
    setSelected([]);
    list.reload();
    onChanged(); // parent re-fetches the zone so record count stays right
  };

  const canDelete = selected.length > 0 && selected.every((r) => !r.is_default);

  const deleteSelected = async () => {
    if (selected.length === 1) await recordsApi.remove(zone.id, selected[0].id);
    else await recordsApi.bulkDelete(zone.id, selected.map((r) => r.id));
    notify.success(`${selected.length} record(s) were successfully deleted.`);
    setShowDelete(false);
    refresh();
  };

  return (
    <>
      <Table
        variant="container"
        items={list.items}
        columnDefinitions={COLUMNS}
        trackBy="id"
        loading={list.loading}
        loadingText="Loading records"
        selectionType="multi"
        selectedItems={selected}
        onSelectionChange={({ detail }) => setSelected(detail.selectedItems)}
        ariaLabels={{
          selectionGroupLabel: "Record selection",
          itemSelectionLabel: (_, r) => `${r.name} ${r.type}`,
          allItemsSelectionLabel: () => "Select all",
        }}
        wrapLines
        header={
          <Header
            counter={selected.length ? `(${selected.length}/${list.total})` : `(${list.total})`}
            info={<Box color="text-status-info" fontSize="body-s">Info</Box>}
            description="Automatic mode is the current search behavior optimized for best filter results."
            actions={
              <SpaceBetween direction="horizontal" size="xs">
                <Button iconName="refresh" ariaLabel="Refresh" onClick={() => list.reload()} />
                <Button disabled={!canDelete} onClick={() => setShowDelete(true)}>Delete record</Button>
                <Button onClick={() => setShowImport(true)}>Import zone file</Button>
                <Button
                  disabled={selected.length !== 1}
                  onClick={() => router.push(`/hostedzones/${zone.id}/records/${selected[0].id}/edit`)}
                >
                  Edit record
                </Button>
                <Button variant="primary" onClick={() => router.push(`/hostedzones/${zone.id}/records/create`)}>Create record</Button>
              </SpaceBetween>
            }
          >
            Records
          </Header>
        }
        filter={
          <div className="r53-filters">
            <TextFilter
              filteringText={list.filterText}
              filteringPlaceholder="Filter records by property or value"
              filteringAriaLabel="Filter records"
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
            pageSizePreference={{ title: "Page size", options: [10, 20, 50].map((v) => ({ value: v, label: `${v} records` })) }}
            onConfirm={({ detail }) => list.setPageSize(detail.pageSize ?? 10)}
          />
        }
        empty={
          <Box textAlign="center" color="inherit" padding="l">
            <b>No records</b>
            <Box variant="p" color="inherit">{list.error ?? "No records match the filter."}</Box>
          </Box>
        }
      />

      <DeleteModal
        visible={showDelete}
        title="Delete records"
        onCancel={() => setShowDelete(false)}
        onConfirm={deleteSelected}
      >
        <Box>Are you sure you want to delete the following {selected.length} record(s)? This can&apos;t be undone.</Box>
        <ul>{selected.map((r) => <li key={r.id}>{r.name} ({r.type})</li>)}</ul>
      </DeleteModal>

      <ImportModal zone={zone} visible={showImport} onClose={() => setShowImport(false)} onImported={refresh} />
    </>
  );
}
