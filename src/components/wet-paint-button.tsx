"use client";

import { useId } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const DRIPS = [
  { max: 9, duration: 2.4, delay: 0 },
  { max: 16, duration: 2.9, delay: -0.6 },
  { max: 7, duration: 2.2, delay: -1.4 },
  { max: 13, duration: 3.1, delay: -0.2 },
  { max: 6, duration: 2.6, delay: -1.9 },
];

const surfaceClass =
  "group/paint relative isolate inline-flex h-11 items-center justify-center overflow-visible rounded-full px-6 text-sm font-medium text-primary-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

/** Camada visual "tinta molhada": corpo + gotas contínuas, fundidos por
 * filtro SVG (goo). Referência: Wet Paint Button, hover.dev — recriação
 * autoral, nenhum código de terceiros foi copiado. */
function WetPaintSurface({ children }: { children: React.ReactNode }) {
  const filterId = useId();

  return (
    <>
      <svg width="0" height="0" className="absolute">
        <defs>
          <filter
            id={filterId}
            x="-60%"
            y="-60%"
            width="220%"
            height="280%"
            colorInterpolationFilters="sRGB"
          >
            <feGaussianBlur in="SourceGraphic" stdDeviation="6.5" result="blur" />
            <feColorMatrix
              in="blur"
              type="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7"
              result="goo"
            />
            <feComposite in="SourceGraphic" in2="goo" operator="atop" />
          </filter>
        </defs>
      </svg>

      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-11"
        style={{ filter: `url(#${filterId})` }}
      >
        <span className="absolute inset-0 rounded-full bg-primary transition-colors duration-150 group-hover/paint:bg-primary/92" />
        <span className="absolute inset-x-0 top-[calc(100%-1px)] flex justify-center gap-[7%] px-[19%]">
          {DRIPS.map((drip, i) => (
            <span
              key={i}
              style={
                {
                  "--drip": `${drip.max}px`,
                  animationDuration: `${drip.duration}s`,
                  animationDelay: `${drip.delay}s`,
                } as React.CSSProperties
              }
              className="animate-wet-drip size-3.5 rounded-full bg-primary"
            />
          ))}
        </span>
      </span>

      <span className="relative z-10 flex h-full items-center justify-center gap-2">
        {children}
      </span>
    </>
  );
}

/** Botão de ação (onClick / submit). Use dentro de Client Components. */
export function WetPaintButton({
  children,
  className,
  ...props
}: React.ComponentProps<"button">) {
  return (
    <button
      className={cn(surfaceClass, "disabled:pointer-events-none disabled:opacity-60", className)}
      {...props}
    >
      <WetPaintSurface>{children}</WetPaintSurface>
    </button>
  );
}

/** Botão de navegação (next/link). Seguro para uso direto em Server
 * Components — o `Link` vive dentro deste módulo cliente, então o
 * componente pai só precisa passar `href` e `children` (serializáveis). */
export function WetPaintLinkButton({
  children,
  className,
  href,
  ...props
}: React.ComponentProps<typeof Link>) {
  return (
    <Link href={href} className={cn(surfaceClass, className)} {...props}>
      <WetPaintSurface>{children}</WetPaintSurface>
    </Link>
  );
}
