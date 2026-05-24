import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "보팃 VoteIt",
    short_name: "VoteIt",
    description: "정치 현안에 대한 다양한 관점을 비교하고 의견을 표현하는 시민 플랫폼",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f4f7fb",
    theme_color: "#0f2744",
    orientation: "portrait",
    icons: [
      {
        src: "/icons/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable"
      },
      {
        src: "/icons/apple-touch-icon.svg",
        sizes: "180x180",
        type: "image/svg+xml"
      }
    ],
    screenshots: [
      {
        src: "/icons/screenshot-mobile.svg",
        sizes: "390x844",
        type: "image/svg+xml",
        form_factor: "narrow"
      }
    ]
  };
}
