import type { MetadataRoute } from "next";

/** Supaya Jajanku bisa dipasang di layar utama HP seperti aplikasi. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Jajanku — catat jajan dari foto",
    short_name: "Jajanku",
    description: "Foto jajananmu, AI yang mencatat. Tiap item jadi stiker di kalendermu.",
    lang: "id",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#FFFFFF",
    theme_color: "#FFFFFF",
    categories: ["finance", "food", "lifestyle"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Foto jajanan", short_name: "Foto", url: "/tambah", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Statistik", url: "/statistik" },
      { name: "Tanya Jaja", url: "/chat" },
    ],
  };
}
