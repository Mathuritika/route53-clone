"use client";
import TopNavigation from "@cloudscape-design/components/top-navigation";
import { applyMode, Mode } from "@cloudscape-design/global-styles";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";

// Small "aws" wordmark with the orange smile, as an inline SVG
const AWS_LOGO =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="60" height="36" viewBox="0 0 60 36"><text x="4" y="21" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="20" fill="#ffffff">aws</text><path d="M6 27 Q28 36 50 26" stroke="#ff9900" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M45 24 L51 26 L47 30" stroke="#ff9900" stroke-width="2.5" fill="none" stroke-linecap="round"/></svg>`
  );

export default function TopNav() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [dark, setDark] = useState(false);

  // Dark mode (bonus): Cloudscape switches every component's colours with applyMode
  useEffect(() => {
    const saved = localStorage.getItem("r53_dark") === "1";
    setDark(saved);
    applyMode(saved ? Mode.Dark : Mode.Light);
  }, []);

  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    localStorage.setItem("r53_dark", next ? "1" : "0");
    applyMode(next ? Mode.Dark : Mode.Light);
  };

  return (
    <TopNavigation
      identity={{
        href: "/hostedzones",
        logo: { src: AWS_LOGO, alt: "AWS" },
        onFollow: (e) => { e.preventDefault(); router.push("/hostedzones"); },
      }}
      search={<input className="r53-search" placeholder="Search    [Alt+S]" aria-label="Search" />}
      utilities={[
        { type: "button", text: "Services", iconName: "grid-view" },
        { type: "button", iconName: dark ? "star-filled" : "star", title: "Toggle dark mode", ariaLabel: "Toggle dark mode", text: dark ? "Light" : "Dark", onClick: toggleDark },
        { type: "button", iconName: "notification", ariaLabel: "Notifications", title: "Notifications" },
        { type: "button", iconName: "settings", ariaLabel: "Settings", title: "Settings" },
        { type: "button", text: "Global" },
        {
          type: "menu-dropdown",
          text: user ? `${user.username} @ ${user.account_id.replace(/(\d{4})(\d{4})(\d{4})/, "$1-$2-$3")}` : "",
          items: [
            { id: "account", text: `Account ID: ${user?.account_id ?? ""}` },
            { id: "signout", text: "Sign out" },
          ],
          onItemClick: async ({ detail }) => {
            if (detail.id === "signout") {
              await logout();
              router.replace("/login");
            }
          },
        },
      ]}
      i18nStrings={{ overflowMenuTriggerText: "More", overflowMenuTitleText: "All" }}
    />
  );
}
