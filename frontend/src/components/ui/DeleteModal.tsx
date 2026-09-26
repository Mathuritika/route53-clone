"use client";
// Reusable delete confirmation. With confirmWord set, the user must type it (Route 53 asks you to type "delete").
import Alert from "@cloudscape-design/components/alert";
import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import FormField from "@cloudscape-design/components/form-field";
import Input from "@cloudscape-design/components/input";
import Modal from "@cloudscape-design/components/modal";
import SpaceBetween from "@cloudscape-design/components/space-between";
import { useEffect, useState, type ReactNode } from "react";

interface Props {
  visible: boolean;
  title: string;
  children: ReactNode;
  confirmWord?: string;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}

export default function DeleteModal({ visible, title, children, confirmWord, onCancel, onConfirm }: Props) {
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // reset every time the modal opens
  useEffect(() => {
    if (visible) {
      setTyped("");
      setError(null);
    }
  }, [visible]);

  const confirm = async () => {
    setBusy(true);
    setError(null);
    try {
      await onConfirm();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const canDelete = !confirmWord || typed === confirmWord;

  return (
    <Modal
      visible={visible}
      onDismiss={onCancel}
      header={title}
      footer={
        <Box float="right">
          <SpaceBetween direction="horizontal" size="xs">
            <Button variant="link" onClick={onCancel}>Cancel</Button>
            <Button variant="primary" onClick={confirm} loading={busy} disabled={!canDelete}>Delete</Button>
          </SpaceBetween>
        </Box>
      }
    >
      <SpaceBetween size="m">
        {children}
        {confirmWord && (
          <FormField label={<>To confirm deletion, type <i>{confirmWord}</i> in the field.</>}>
            <Input value={typed} onChange={({ detail }) => setTyped(detail.value)} placeholder={confirmWord} />
          </FormField>
        )}
        {error && <Alert type="error">{error}</Alert>}
      </SpaceBetween>
    </Modal>
  );
}
