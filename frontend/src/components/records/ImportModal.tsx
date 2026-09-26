"use client";
// Bonus: paste a BIND zone file and create all its records.
import Alert from "@cloudscape-design/components/alert";
import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import FormField from "@cloudscape-design/components/form-field";
import Modal from "@cloudscape-design/components/modal";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Textarea from "@cloudscape-design/components/textarea";
import { useState } from "react";
import { useNotifications } from "@/context/NotificationContext";
import { zonesApi } from "@/lib/api";
import type { HostedZone } from "@/lib/types";

interface Props {
  zone: HostedZone;
  visible: boolean;
  onClose: () => void;
  onImported: () => void;
}

const EXAMPLE = `$TTL 300
www      IN  A      192.0.2.1
mail     IN  MX     10 mail.example.com.
@        IN  TXT    "v=spf1 -all"`;

export default function ImportModal({ zone, visible, onClose, onImported }: Props) {
  const notify = useNotifications();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [skipped, setSkipped] = useState<string[]>([]);

  const close = () => {
    setText("");
    setError(null);
    setSkipped([]);
    onClose();
  };

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await zonesApi.importZone(zone.id, text);
      notify.success(`Imported ${res.created} record(s) into ${zone.name}.`);
      onImported();
      if (res.skipped.length) setSkipped(res.skipped); // keep modal open to show what was skipped
      else close();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      visible={visible}
      onDismiss={close}
      size="large"
      header="Import zone file"
      footer={
        <Box float="right">
          <SpaceBetween direction="horizontal" size="xs">
            <Button variant="link" onClick={close}>Cancel</Button>
            <Button variant="primary" loading={busy} disabled={!text.trim()} onClick={submit}>Import</Button>
          </SpaceBetween>
        </Box>
      }
    >
      <SpaceBetween size="m">
        <FormField label="Zone file" description="Paste a zone file in BIND format. SOA and NS records for the zone apex are skipped.">
          <Textarea rows={12} value={text} placeholder={EXAMPLE} onChange={({ detail }) => setText(detail.value)} />
        </FormField>
        {error && <Alert type="error">{error}</Alert>}
        {skipped.length > 0 && (
          <Alert type="warning" header={`${skipped.length} record(s) were skipped`}>
            {skipped.map((s) => <div key={s}>{s}</div>)}
          </Alert>
        )}
      </SpaceBetween>
    </Modal>
  );
}
