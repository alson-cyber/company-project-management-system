import type { Metadata } from "next";
import "@fontsource-variable/inter";
import "./globals.css";
import { THEME_BOOT_SCRIPT } from "@/components/shell/theme";

export const metadata: Metadata = {
  title: { default: "Workhub", template: "%s · Workhub" },
  description: "Internal project management system.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // The boot script may add data-theme before React loads, so the attribute is allowed to differ.
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
