"use client";
// Mocked AWS sign-in page
import Alert from "@cloudscape-design/components/alert";
import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import Container from "@cloudscape-design/components/container";
import FormField from "@cloudscape-design/components/form-field";
import Header from "@cloudscape-design/components/header";
import Input from "@cloudscape-design/components/input";
import SpaceBetween from "@cloudscape-design/components/space-between";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const { user, loading, login } = useAuth();
  const router = useRouter();
  const [accountId, setAccountId] = useState("123456789012");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Already signed in (session persisted) -> skip the login page
  useEffect(() => {
    if (!loading && user) router.replace("/hostedzones");
  }, [loading, user, router]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(username, password);
      router.replace("/hostedzones");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="r53-login">
      <div className="r53-login-logo">aws</div>
      <div className="r53-login-card">
        <Container header={<Header variant="h1">Sign in as IAM user</Header>}>
          <form onSubmit={submit}>
            <SpaceBetween size="l">
              <FormField label="Account ID (12 digits) or account alias">
                <Input value={accountId} onChange={({ detail }) => setAccountId(detail.value)} />
              </FormField>
              <FormField label="IAM user name">
                <Input value={username} autoFocus onChange={({ detail }) => setUsername(detail.value)} />
              </FormField>
              <FormField label="Password">
                <Input type="password" value={password} onChange={({ detail }) => setPassword(detail.value)} />
              </FormField>
              {error && <Alert type="error">{error}</Alert>}
              <Button variant="primary" fullWidth loading={busy}>Sign in</Button>
              <Alert type="info">
                Demo credentials: <b>demo</b> / <b>demo1234</b>
              </Alert>
            </SpaceBetween>
          </form>
        </Container>
        <Box textAlign="center" color="text-body-secondary" fontSize="body-s" padding={{ top: "m" }}>
          Route 53 console clone. Authentication is mocked.
        </Box>
      </div>
    </div>
  );
}
