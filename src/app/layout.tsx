import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Energieprijs Monitor",
  description: "Realtime inzicht in Nederlandse dynamische stroom- en gastarieven (EPEX day-ahead / EEX), incl. de goedkoopste momenten.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="nl" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
