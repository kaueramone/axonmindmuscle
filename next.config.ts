import type { NextConfig } from "next";

/**
 * O anfitrião do Storage do Supabase é derivado do URL do projecto para que
 * next/image possa optimizar as imagens dos exercícios. Se a variável não
 * existir (build local sem ambiente), a lista fica vazia em vez de rebentar.
 */
const supabaseHost = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").hostname;
  } catch {
    return null;
  }
})();

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: supabaseHost
      ? [
          {
            protocol: "https" as const,
            hostname: supabaseHost,
            pathname: "/storage/v1/object/public/**",
          },
        ]
      : [],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          {
            // A Vercel ja envia HSTS no dominio proprio, mas sem
            // `includeSubDomains` nem `preload`. Sem o primeiro, uma primeira
            // visita a `painel.` por http fica ao alcance de quem estiver no
            // meio do caminho — e o painel e onde estao os utilizadores todos.
            // O `preload` e a candidatura a lista embutida nos browsers: a
            // diretiva sozinha nao inscreve nada, e submissao faz-se em
            // hstspreload.org, mas tem de constar para ser aceite.
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
        ],
      },
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default nextConfig;
