"use client";

import { useEffect, useState } from "react";

/** Conta de 0 até `value` uma única vez, ao entrar em tela. Delight ocasional
 * (carregamento do painel) — não usar em elementos que atualizam com frequência.
 * Troca de dígitos não envolve transform/movimento, então não é afetada por
 * prefers-reduced-motion. */
export function CountUp({
  value,
  durationMs = 700,
  className,
}: {
  value: number;
  durationMs?: number;
  className?: string;
}) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const start = performance.now();
    let frame: number;

    function tick(now: number) {
      const progress = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * value));
      if (progress < 1) frame = requestAnimationFrame(tick);
    }

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, durationMs]);

  return <span className={className}>{display}</span>;
}
