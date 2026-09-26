"use client";
import SideNavigation from "@cloudscape-design/components/side-navigation";
import { usePathname } from "next/navigation";
import { useFollow } from "@/hooks/useFollow";

// Same structure as the Route 53 console left menu
export default function SideNav() {
  const pathname = usePathname();
  const follow = useFollow();
  const active = pathname.startsWith("/hostedzones") ? "/hostedzones" : pathname;

  return (
    <SideNavigation
      header={{ text: "Route 53", href: "/dashboard" }}
      activeHref={active}
      onFollow={follow}
      items={[
        { type: "link", text: "Dashboard", href: "/dashboard" },
        { type: "link", text: "Hosted zones", href: "/hostedzones" },
        { type: "link", text: "Health checks", href: "/healthchecks" },
        { type: "link", text: "Profiles", href: "/profiles" },
        { type: "divider" },
        {
          type: "section", text: "Traffic flow",
          items: [
            { type: "link", text: "Traffic policies", href: "/trafficpolicies" },
            { type: "link", text: "Policy records", href: "/trafficpolicies/records" },
          ],
        },
        {
          type: "section", text: "Domains",
          items: [
            { type: "link", text: "Registered domains", href: "/domains" },
            { type: "link", text: "Requests", href: "/domains/requests" },
          ],
        },
        {
          type: "section", text: "Resolver",
          items: [
            { type: "link", text: "VPCs", href: "/resolver" },
            { type: "link", text: "Inbound endpoints", href: "/resolver/inbound" },
            { type: "link", text: "Outbound endpoints", href: "/resolver/outbound" },
            { type: "link", text: "Rules", href: "/resolver/rules" },
            { type: "link", text: "Query logging", href: "/resolver/querylogging" },
          ],
        },
      ]}
    />
  );
}
