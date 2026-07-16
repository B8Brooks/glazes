import type { MetadataRoute } from "next";

// Web app manifest so the site can be added to a phone's home screen and
// open full-screen like a real app ("Add to Home Screen" in Safari/Chrome).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Sheila's Glazes",
    short_name: "Glazes",
    description: "Glaze recipes and material inventory",
    start_url: "/",
    display: "standalone",
    background_color: "#faf8f5",
    theme_color: "#a04c2c",
    icons: [
      { src: "/icon.png", sizes: "512x512", type: "image/png" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
