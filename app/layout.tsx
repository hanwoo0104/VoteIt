import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PWAInstallPrompt } from "@/components/common/PWAInstallPrompt";

export const metadata: Metadata = {
  title: {
    default: "보팃 VoteIt",
    template: "%s | VoteIt"
  },
  description: "정치 현안에 대한 다양한 관점을 비교하고 의견을 표현하는 시민 플랫폼",
  applicationName: "VoteIt",
  appleWebApp: {
    capable: true,
    title: "VoteIt",
    statusBarStyle: "default"
  },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icons/icon.svg",
    apple: "/icons/apple-touch-icon.svg"
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#0f2744"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>
        {children}
        <PWAInstallPrompt />
      </body>
    </html>
  );
}
