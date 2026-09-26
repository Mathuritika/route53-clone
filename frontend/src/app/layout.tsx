import "@cloudscape-design/global-styles/index.css";
import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import Providers from "./providers";

export const metadata: Metadata = {
  title: "Route 53 Console",
  description: "AWS Route 53 console clone",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
