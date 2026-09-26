"use client";
import Box from "@cloudscape-design/components/box";
import Container from "@cloudscape-design/components/container";
import Header from "@cloudscape-design/components/header";
import SpaceBetween from "@cloudscape-design/components/space-between";
import ConsoleLayout from "@/components/layout/ConsoleLayout";

// Placeholder page for the sections the assignment allows us to mock
export default function ComingSoon({ title, href }: { title: string; href: string }) {
  return (
    <ConsoleLayout breadcrumbs={[{ text: title, href }]}>
      <SpaceBetween size="l">
        <Header variant="h1">{title}</Header>
        <Container>
          <Box textAlign="center" padding={{ vertical: "xxl" }} color="text-body-secondary">
            <Box variant="h2" padding={{ bottom: "s" }}>Coming soon</Box>
            <Box variant="p" color="inherit">
              {title} is not part of this Route 53 clone yet. Go to Hosted zones to manage DNS.
            </Box>
          </Box>
        </Container>
      </SpaceBetween>
    </ConsoleLayout>
  );
}
