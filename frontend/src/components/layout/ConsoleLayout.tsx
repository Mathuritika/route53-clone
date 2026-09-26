"use client";
// The console "shell" used by every signed-in page: top bar, left menu, breadcrumbs, notifications.
import AppLayout from "@cloudscape-design/components/app-layout";
import BreadcrumbGroup from "@cloudscape-design/components/breadcrumb-group";
import Flashbar from "@cloudscape-design/components/flashbar";
import Spinner from "@cloudscape-design/components/spinner";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";
import { useNotifications } from "@/context/NotificationContext";
import { useFollow } from "@/hooks/useFollow";
import SideNav from "./SideNav";
import TopNav from "./TopNav";

interface Props {
  breadcrumbs: { text: string; href: string }[];
  children: ReactNode;
  contentType?: "default" | "table" | "form";
}

export default function ConsoleLayout({ breadcrumbs, children, contentType = "default" }: Props) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const follow = useFollow();
  const { items } = useNotifications();

  // Route guard: not signed in -> go to login page
  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="r53-center">
        <Spinner size="large" />
      </div>
    );
  }

  return (
    <>
      <div id="top-nav" className="r53-topnav">
        <TopNav />
      </div>
      <AppLayout
        headerSelector="#top-nav"
        navigation={<SideNav />}
        breadcrumbs={
          <BreadcrumbGroup
            items={[{ text: "Route 53", href: "/dashboard" }, ...breadcrumbs]}
            onFollow={follow}
            ariaLabel="Breadcrumbs"
          />
        }
        notifications={<Flashbar items={items} stackItems={items.length > 2} />}
        content={children}
        contentType={contentType}
        toolsHide
      />
    </>
  );
}
