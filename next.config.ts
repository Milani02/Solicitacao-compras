import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Permite acessar o servidor de dev pela rede local (ex: 192.168.1.25).
  // Sem isso o Next bloqueia os chunks JS/HMR pra qualquer origem que não
  // seja localhost — a página carrega (HTML/CSS), mas nada interativo
  // funciona porque o JS nunca hidrata.
  allowedDevOrigins: ["192.168.1.25"],
  // Esconde o indicador flutuante do Next (o balão "N" no canto) em dev.
  // Erros de compilação/runtime continuam aparecendo normalmente.
  devIndicators: false,
  // Anexos de cotação (prints de orçamento) podem passar de 1MB, o limite
  // padrão de Server Actions. Cada arquivo ainda é limitado a 5MB na action.
  experimental: {
    serverActions: {
      bodySizeLimit: "8mb",
    },
  },
};

export default nextConfig;
