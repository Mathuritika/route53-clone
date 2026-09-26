"use client";
// Loading spinner or error box while a page's data loads
import Alert from "@cloudscape-design/components/alert";
import Box from "@cloudscape-design/components/box";
import Spinner from "@cloudscape-design/components/spinner";

export default function PageState({ error }: { error: string | null }) {
  if (error) return <Alert type="error" header="Something went wrong">{error}</Alert>;
  return (
    <Box textAlign="center" padding="xxl">
      <Spinner size="large" />
    </Box>
  );
}
