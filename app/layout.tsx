import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cawarden Analytics Admin",
  description: "Google Analytics & Search Console admin panel for Cawarden Reclaim",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
