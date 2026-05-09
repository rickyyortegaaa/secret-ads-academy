import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Placeholders branded con texto sobreimpreso (per-question)
      { protocol: "https", hostname: "placehold.co" },
      // Picsum legacy (mocks antiguos)
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "fastly.picsum.photos" },
      // Imágenes reales subidas al Storage de Supabase
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
};

export default nextConfig;
