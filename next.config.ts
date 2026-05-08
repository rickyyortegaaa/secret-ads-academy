import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Mocks (placeholders gratuitos para preguntas de prueba)
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "fastly.picsum.photos" },
      // Imágenes reales subidas al Storage de Supabase
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
};

export default nextConfig;
