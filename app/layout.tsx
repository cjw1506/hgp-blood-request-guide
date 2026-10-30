import type { Metadata,Viewport } from "next";
import { PwaProvider } from "./Pwa";
import "./globals.css";
import "./colours.css";
import "./login.css";
import "./monitoring-reminder.css";

export const metadata: Metadata = {
  title: "HGP Blood Request Guide",
  description: "Harwood Group Practice staff blood-request guide, monitoring checks and AUDIT-C calculator.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable:true, title:"HGP Bloods", statusBarStyle:"default" },
  icons: {
    apple: "/icons/apple-touch-icon.png",
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export const viewport:Viewport={themeColor:"#174fe0"};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased"><PwaProvider>{children}</PwaProvider></body>
    </html>
  );
}
