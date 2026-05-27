import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PWAInstallPrompt } from "@/components/common/PWAInstallPrompt";
import { AuthBootstrap } from "@/components/common/AuthBootstrap";

export const metadata: Metadata = {
  title: {
    default: "보팃",
    template: "%s | 보팃"
  },
  description: "정치 현안에 대한 다양한 관점을 비교하고 의견을 표현하는 시민 플랫폼",
  applicationName: "보팃",
  appleWebApp: {
    capable: true,
    title: "보팃",
    statusBarStyle: "default"
  },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      {
        url: "/favicon.png",
        type: "image/png",
        sizes: "107x41"
      }
    ],
    shortcut: "/favicon.png",
    apple: "/favicon.png"
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
        <AuthBootstrap />
        {children}
        <PWAInstallPrompt />
      </body>
    </html>
  );
}
