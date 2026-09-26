"use client";
// One form for "Create record" (quick create) and "Edit record". Name and type are locked when editing, like Route 53.
import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import ColumnLayout from "@cloudscape-design/components/column-layout";
import Container from "@cloudscape-design/components/container";
import Form from "@cloudscape-design/components/form";
import FormField from "@cloudscape-design/components/form-field";
import Header from "@cloudscape-design/components/header";
import Input from "@cloudscape-design/components/input";
import Select from "@cloudscape-design/components/select";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Textarea from "@cloudscape-design/components/textarea";
import Toggle from "@cloudscape-design/components/toggle";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useNotifications } from "@/context/NotificationContext";
import { recordsApi } from "@/lib/api";
import { RECORD_TYPES, typeOption } from "@/lib/recordTypes";
import type { DnsRecord, HostedZone } from "@/lib/types";

const TTL_PRESETS = [{ label: "1m", value: 60 }, { label: "1h", value: 3600 }, { label: "1d", value: 86400 }];

export default function RecordForm({ zone, record }: { zone: HostedZone; record?: DnsRecord }) {
  const isEdit = !!record;
  const router = useRouter();
  const notify = useNotifications();
  const zoneBare = zone.name.replace(/\.$/, "");

  // "www.example.com." -> "www" for the Record name box
  const initialName = record ? record.name.replace(/\.$/, "").replace(new RegExp(`\\.?${zoneBare.replace(/\./g, "\\.")}$`), "") : "";

  const [name, setName] = useState(initialName);
  const [type, setType] = useState(record?.type ?? "A");
  const [value, setValue] = useState(record?.values.join("\n") ?? "");
  const [ttl, setTtl] = useState(String(record?.ttl ?? 300));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const placeholder = RECORD_TYPES.find((t) => t.value === type)?.placeholder ?? "";
  const back = () => router.push(`/hostedzones/${zone.id}`);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const values = value.split("\n").map((v) => v.trim()).filter(Boolean);
    const ttlNum = Number(ttl);
    if (!values.length) return setError("Enter at least one value.");
    if (!Number.isInteger(ttlNum) || ttlNum < 0) return setError("TTL must be a whole number of seconds.");

    setBusy(true);
    setError(null);
    try {
      if (isEdit) {
        await recordsApi.update(zone.id, record.id, { ttl: ttlNum, values });
        notify.success(`Record ${record.name} was successfully updated.`);
      } else {
        const created = await recordsApi.create(zone.id, { name, type, ttl: ttlNum, values });
        notify.success(`Record ${created.name} was successfully created.`);
      }
      back();
    } catch (err) {
      setError((err as Error).message); // backend is the source of truth for validation
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit}>
      <Form
        header={<Header variant="h1">{isEdit ? "Edit record" : "Quick create record"}</Header>}
        errorText={error}
        actions={
          <SpaceBetween direction="horizontal" size="xs">
            <Button formAction="none" variant="link" onClick={back}>Cancel</Button>
            <Button variant="primary" loading={busy}>{isEdit ? "Save" : "Create records"}</Button>
          </SpaceBetween>
        }
      >
        <Container header={<Header variant="h2">{isEdit ? "Record details" : "Record 1"}</Header>}>
          <SpaceBetween size="l">
            <ColumnLayout columns={2}>
              <FormField label="Record name" description="Keep blank to create a record for the root domain.">
                <div className="r53-name-field">
                  <Input value={name} disabled={isEdit} placeholder="subdomain" onChange={({ detail }) => setName(detail.value)} />
                  <Box color="text-body-secondary">.{zoneBare}</Box>
                </div>
              </FormField>
              <FormField label="Record type">
                <Select
                  disabled={isEdit}
                  selectedOption={typeOption(type)}
                  options={RECORD_TYPES.map((t) => typeOption(t.value))}
                  onChange={({ detail }) => setType(detail.selectedOption.value!)}
                />
              </FormField>
            </ColumnLayout>

            <Toggle checked={false} disabled description="Alias records are not supported in this clone.">Alias</Toggle>

            <FormField label="Value" description="Enter multiple values on separate lines.">
              <Textarea value={value} rows={3} placeholder={placeholder} onChange={({ detail }) => setValue(detail.value)} />
            </FormField>

            <ColumnLayout columns={2}>
              <FormField label="TTL (seconds)" constraintText="Recommended values: 60 to 172800 (two days)">
                <SpaceBetween direction="horizontal" size="xs">
                  <Input type="number" value={ttl} onChange={({ detail }) => setTtl(detail.value)} />
                  {TTL_PRESETS.map((p) => (
                    <Button key={p.label} formAction="none" onClick={() => setTtl(String(p.value))}>{p.label}</Button>
                  ))}
                </SpaceBetween>
              </FormField>
              <FormField label="Routing policy">
                <Select selectedOption={{ label: "Simple routing", value: "Simple" }} options={[{ label: "Simple routing", value: "Simple" }]} />
              </FormField>
            </ColumnLayout>
          </SpaceBetween>
        </Container>
      </Form>
    </form>
  );
}
