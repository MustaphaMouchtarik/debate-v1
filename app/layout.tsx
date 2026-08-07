import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DebateMe",
  description: "Structured 1v1 debates, judged by AI.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
