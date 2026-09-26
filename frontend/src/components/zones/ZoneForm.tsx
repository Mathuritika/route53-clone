"use client";
// One form for both "Create hosted zone" and "Edit hosted zone" (edit = only description can change).
import Button from "@cloudscape-design/components/button";
import Container from "@cloudscape-design/components/container";
import Form from "@cloudscape-design/components/form";
import FormField from "@cloudscape-design/components/form-field";
import Header from "@cloudscape-design/components/header";
import Input from "@cloudscape-design/components/input";
import Select from "@cloudscape-design/components/select";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Textarea from "@cloudscape-design/components/textarea";
import Tiles from "@cloudscape-design/components/tiles";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useNotifications } from "@/context/NotificationContext";
import { zonesApi } from "@/lib/api";
import type { HostedZone, ZoneType } from "@/lib/types";

const REGIONS = ["us-east-1", "us-west-2", "eu-west-1", "ap-south-1", "ap-southeast-1"].map((r) => ({ label: r, value: r }));

export default function ZoneForm({ zone }: { zone?: HostedZone }) {
  const isEdit = !!zone;
  const router = useRouter();
  const notify = useNotifications();

  const [name, setName] = useState(zone?.name.replace(/\.$/, "") ?? "");
  const [comment, setComment] = useState(zone?.comment ?? "");
  const [zoneType, setZoneType] = useState<ZoneType>(zone?.zone_type ?? "public");
  const [region, setRegion] = useState(zone?.vpc_region ?? "ap-south-1");
  const [vpcId, setVpcId] = useState(zone?.vpc_id ?? "");
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nameError = submitted && !name.trim() ? "Domain name is required." : "";
  const vpcError = submitted && zoneType === "private" && !vpcId.trim() ? "VPC ID is required." : "";

  const cancelHref = isEdit ? `/hostedzones/${zone.id}` : "/hostedzones";

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (!name.trim() || (zoneType === "private" && !vpcId.trim())) return;
    setBusy(true);
    setError(null);
    try {
      if (isEdit) {
        await zonesApi.update(zone.id, comment);
        notify.success(`Hosted zone ${zone.name} was successfully updated.`);
        router.push(`/hostedzones/${zone.id}`);
      } else {
        const created = await zonesApi.create({
          name, comment, zone_type: zoneType,
          vpc_region: zoneType === "private" ? region : null,
          vpc_id: zoneType === "private" ? vpcId : null,
        });
        notify.success(`${created.name} was successfully created. Now you can create records in the hosted zone.`);
        router.push(`/hostedzones/${created.id}`);
      }
    } catch (err) {
      setError((err as Error).message); // backend validation message, e.g. duplicate zone
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit}>
      <Form
        header={
          <Header variant="h1" description={isEdit ? undefined : "A hosted zone is a container that holds information about how you want to route traffic for a domain, such as example.com, and its subdomains."}>
            {isEdit ? "Edit hosted zone" : "Create hosted zone"}
          </Header>
        }
        errorText={error}
        actions={
          <SpaceBetween direction="horizontal" size="xs">
            <Button formAction="none" variant="link" onClick={() => router.push(cancelHref)}>Cancel</Button>
            <Button variant="primary" loading={busy}>{isEdit ? "Save changes" : "Create hosted zone"}</Button>
          </SpaceBetween>
        }
      >
        <SpaceBetween size="l">
          <Container header={<Header variant="h2">Hosted zone configuration</Header>}>
            <SpaceBetween size="l">
              <FormField
                label="Domain name"
                description="This is the name of the domain that you want to route traffic for."
                constraintText="Valid characters: a-z, 0-9, ! &quot; # $ % & ' ( ) * + , - / : ; < = > ? @ [ \ ] ^ _ ` { | } . ~"
                errorText={nameError}
              >
                <Input value={name} disabled={isEdit} placeholder="example.com" onChange={({ detail }) => setName(detail.value)} />
              </FormField>
              <FormField
                label={<>Description <i>- optional</i></>}
                description="This value lets you distinguish hosted zones that have the same name."
                constraintText={`The description can have up to 256 characters. ${comment.length}/256`}
              >
                <Textarea value={comment} placeholder="The hosted zone is used for..." onChange={({ detail }) => setComment(detail.value.slice(0, 256))} />
              </FormField>
              <FormField label="Type" description="The type indicates whether you want to route traffic on the internet or in an Amazon VPC.">
                <Tiles
                  value={zoneType}
                  onChange={({ detail }) => setZoneType(detail.value as ZoneType)}
                  items={[
                    { value: "public", label: "Public hosted zone", description: "A public hosted zone determines how traffic is routed on the internet.", disabled: isEdit },
                    { value: "private", label: "Private hosted zone", description: "A private hosted zone determines how traffic is routed within an Amazon VPC.", disabled: isEdit },
                  ]}
                />
              </FormField>
            </SpaceBetween>
          </Container>

          {zoneType === "private" && (
            <Container header={<Header variant="h2" description="To use this hosted zone to resolve DNS queries for one or more VPCs, choose the VPCs.">VPCs to associate with the hosted zone</Header>}>
              <SpaceBetween size="l">
                <FormField label="Region">
                  <Select
                    disabled={isEdit}
                    selectedOption={{ label: region, value: region }}
                    options={REGIONS}
                    onChange={({ detail }) => setRegion(detail.selectedOption.value!)}
                  />
                </FormField>
                <FormField label="VPC ID" errorText={vpcError}>
                  <Input disabled={isEdit} value={vpcId} placeholder="vpc-0a1b2c3d4e5f67890" onChange={({ detail }) => setVpcId(detail.value)} />
                </FormField>
              </SpaceBetween>
            </Container>
          )}
        </SpaceBetween>
      </Form>
    </form>
  );
}
