import type { Metadata } from "next";
import { IBM_Plex_Sans_Thai } from "next/font/google";
import { ToastProvider } from "@/components/Toast";
import { th } from "@/copy/th";
import "./globals.css";

const plex = IBM_Plex_Sans_Thai({ subsets: ["thai", "latin"], weight: ["400", "500", "600"], variable: "--font-plex" });

export const metadata: Metadata = { title: th.appName };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={plex.variable}>
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
