import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Default es 1MB — insuficiente para manuales/PDFs (módulo Knowledge,
      // Documentación). 10MB cubre el caso típico sin abrir la puerta a
      // archivos enormes que agoten memoria del server.
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
