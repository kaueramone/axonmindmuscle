import { cn } from "@/lib/utils";

/**
 * O avatar de uma pessoa, nas três formas que pode ter: fotografia, figura
 * gerada a partir de uma semente, ou a inicial do nome.
 *
 * A figura gerada existe para quem não quer pôr a cara na comunidade — o
 * problema de exposição que as reviews do nicho repetem. É desenhada aqui,
 * em SVG, a partir de um hash da semente: sem biblioteca, sem CDN (a CSP
 * bloqueia-os) e sem nenhum pedido de rede. A mesma semente dá sempre a
 * mesma figura, em qualquer dispositivo.
 */

const PALETAS: [string, string][] = [
  ["#307fe2", "#0b1c33"],
  ["#2fb0a3", "#0b2a27"],
  ["#d98a2b", "#2d1a06"],
  ["#c2497a", "#2c0f1d"],
  ["#7b5cd6", "#1a1233"],
  ["#4c9a3f", "#10240c"],
  ["#d9534f", "#2b0f0e"],
  ["#4a90e8", "#0d1a2e"],
];

/** FNV-1a de 32 bits: determinístico, barato, e chega para escolher formas. */
function hash(texto: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < texto.length; i += 1) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function GeneratedAvatar({
  seed,
  size = 40,
  className,
}: {
  seed: string;
  size?: number;
  className?: string;
}) {
  const h = hash(seed || "axon");
  const [cor, fundo] = PALETAS[h % PALETAS.length];
  // Cinco "nós" de sinapse em posições derivadas do hash, ligados ao centro.
  // Cada semente tem a sua constelação; nenhuma se parece com uma cara.
  const nos = Array.from({ length: 5 }, (_, i) => {
    const bits = (h >>> (i * 6)) & 63;
    const angulo = (bits / 64) * Math.PI * 2 + i * 1.3;
    const raio = 22 + ((h >>> (i * 3)) & 7) * 1.5;
    return {
      x: 50 + Math.cos(angulo) * raio,
      y: 50 + Math.sin(angulo) * raio,
      r: 4 + ((h >>> (i * 4 + 2)) & 3),
    };
  });

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      role="img"
      aria-hidden="true"
      className={cn("shrink-0 rounded-full", className)}
    >
      <rect width="100" height="100" fill={fundo} />
      {nos.map((n, i) => (
        <line
          key={`l${i}`}
          x1="50"
          y1="50"
          x2={n.x}
          y2={n.y}
          stroke={cor}
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity="0.7"
        />
      ))}
      {nos.map((n, i) => (
        <circle key={`c${i}`} cx={n.x} cy={n.y} r={n.r} fill={cor} />
      ))}
      <circle cx="50" cy="50" r="9" fill={cor} />
      <circle cx="50" cy="50" r="4" fill={fundo} />
    </svg>
  );
}

export function Avatar({
  nome,
  url,
  kind = "photo",
  seed,
  size = 40,
  className,
}: {
  nome: string;
  url: string | null;
  kind?: "photo" | "generated";
  seed?: string | null;
  size?: number;
  className?: string;
}) {
  if (kind === "generated") {
    return <GeneratedAvatar seed={seed ?? nome} size={size} className={className} />;
  }
  if (url) {
    // Não passa por next/image de propósito: é uma miniatura vinda do Storage,
    // e uma optimização por avatar visível encarecia o feed inteiro para
    // poupar bytes que já são poucos.
    return (
      <img
        src={url}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        style={{ width: size, height: size }}
        className={cn("shrink-0 rounded-full object-cover", className)}
      />
    );
  }
  return (
    <span
      style={{ width: size, height: size, fontSize: Math.round(size * 0.42) }}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-accent-soft font-semibold text-accent",
        className,
      )}
    >
      {nome.replace("@", "").charAt(0).toUpperCase()}
    </span>
  );
}
