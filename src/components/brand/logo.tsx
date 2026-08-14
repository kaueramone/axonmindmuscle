import {
  LOCKUP_ORIGIN,
  LOCKUP_VIEWBOX,
  PATH_IMPULSE,
  PATH_SYMBOL,
  PATH_TAGLINE,
  PATH_TAGLINE_DOT,
  PATH_WORDMARK,
  SYMBOL_ORIGIN,
  SYMBOL_VIEWBOX,
  WORDMARK_ORIGIN,
  WORDMARK_VIEWBOX,
} from "./logo-paths";

type LogoProps = {
  className?: string;
  /** Cor do impulso e da tagline. Predefinição: azul Sinapse. */
  accent?: string;
  title?: string;
};

const ACCENT = "#307FE2";

/**
 * Lockup completo: símbolo, wordmark e tagline.
 * O traço segue `currentColor`; o impulso mantém o azul Sinapse.
 */
export function LogoLockup({
  className,
  accent = ACCENT,
  title = "AXON Mind-Muscle",
}: LogoProps) {
  return (
    <svg
      viewBox={LOCKUP_VIEWBOX}
      className={className}
      role="img"
      aria-label={title}
      fill="none"
    >
      <g transform={`translate(${-LOCKUP_ORIGIN.x} ${-LOCKUP_ORIGIN.y})`}>
        <path d={PATH_SYMBOL} fill="currentColor" />
        <path d={PATH_IMPULSE} fill={accent} />
        <path d={PATH_WORDMARK} fill="currentColor" />
        <path d={PATH_TAGLINE} fill={accent} />
        <path d={PATH_TAGLINE_DOT} fill={accent} />
      </g>
    </svg>
  );
}

/** Apenas o símbolo — neurónio deitado que vira barra. Proporção 4,49 : 1. */
export function LogoSymbol({
  className,
  accent = ACCENT,
  title = "AXON",
}: LogoProps) {
  return (
    <svg
      viewBox={SYMBOL_VIEWBOX}
      className={className}
      role="img"
      aria-label={title}
      fill="none"
    >
      <g transform={`translate(${-SYMBOL_ORIGIN.x} ${-SYMBOL_ORIGIN.y})`}>
        <path d={PATH_SYMBOL} fill="currentColor" />
        <path d={PATH_IMPULSE} fill={accent} />
      </g>
    </svg>
  );
}

/** Wordmark AXON com a tagline, sem o símbolo. */
export function LogoWordmark({
  className,
  accent = ACCENT,
  title = "AXON Mind-Muscle",
}: LogoProps) {
  return (
    <svg
      viewBox={WORDMARK_VIEWBOX}
      className={className}
      role="img"
      aria-label={title}
      fill="none"
    >
      <g transform={`translate(${-WORDMARK_ORIGIN.x} ${-WORDMARK_ORIGIN.y})`}>
        <path d={PATH_WORDMARK} fill="currentColor" />
        <path d={PATH_TAGLINE} fill={accent} />
        <path d={PATH_TAGLINE_DOT} fill={accent} />
      </g>
    </svg>
  );
}

/**
 * Símbolo com o impulso animado — usado em estados de carregamento
 * e no ecrã de arranque da aplicação.
 */
export function LogoPulse({ className, title = "AXON" }: LogoProps) {
  return (
    <svg
      viewBox={SYMBOL_VIEWBOX}
      className={className}
      role="img"
      aria-label={title}
      fill="none"
    >
      <g transform={`translate(${-SYMBOL_ORIGIN.x} ${-SYMBOL_ORIGIN.y})`}>
        <path d={PATH_SYMBOL} fill="currentColor" opacity={0.5} />
        <path
          d={PATH_IMPULSE}
          fill={ACCENT}
          className="animate-impulse origin-center"
          style={{ transformBox: "fill-box" }}
        />
      </g>
    </svg>
  );
}
