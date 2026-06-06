import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "보팃",
    short_name: "보팃",
    description: "정치 현안에 대한 다양한 관점을 비교하고 의견을 표현하는 시민 플랫폼",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f4f7fb",
    theme_color: "#0f2744",
    orientation: "portrait",
    icons: [
      {
        src: "/brand/voteit-logo.png",
        sizes: "2700x1082",
        type: "image/png",
        purpose: "any"
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
