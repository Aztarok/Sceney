import type { Metadata } from "next";
import { VideoStoreProvider } from "@/components/video-store-provider";
import "./globals.css";

// Every HTML response needs the fresh script nonce supplied by the proxy.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sceney | Video queue",
  description:
    "Arrange videos, play them in sequence, and jump between clips with your keyboard.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <VideoStoreProvider>{children}</VideoStoreProvider>
      </body>
    </html>
  );
}
