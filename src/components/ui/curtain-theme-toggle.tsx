"use client";

import { useCallback, useState, type CSSProperties } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Espelha --background de globals.css (claro/escuro) — a cortina precisa
 * cair exatamente na cor de fundo do tema de destino, senão pisca no meio
 * da transição. Se globals.css mudar essas cores, atualize aqui também. */
const CURTAIN_BG = {
  light: "#f5f5f7",
  dark: "#1c1c1e",
} as const;

const EASING = "cubic-bezier(0.76, 0, 0.24, 1)";

type CurtainPhase = "idle" | "falling" | "covered" | "rising";

export function CurtainThemeToggle({
  duration = 550,
  className,
}: {
  duration?: number;
  className?: string;
}) {
  const { resolvedTheme, setTheme } = useTheme();
  const [phase, setPhase] = useState<CurtainPhase>("idle");
  const [curtainColor, setCurtainColor] = useState("");

  const toggle = useCallback(() => {
    if (phase !== "idle") return;
    const next = resolvedTheme === "dark" ? "light" : "dark";
    setCurtainColor(CURTAIN_BG[next]);
    setPhase("falling");

    window.setTimeout(() => {
      setTheme(next);
      // Congela na posição "cobrindo tudo" sem transição por dois frames —
      // sem isso, o React troca o alvo do transform (0% -> 100%) no mesmo
      // commit que troca a fase, e o navegador não tem um valor "atual"
      // assentado pra animar a partir dele: a cortina pula direto pro fim
      // em vez de continuar descendo.
      setPhase("covered");
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setPhase("rising");
          window.setTimeout(() => setPhase("idle"), duration + 60);
        });
      });
    }, duration);
  }, [phase, resolvedTheme, setTheme, duration]);

  // A cortina não "cresce" a partir do topo (scaleY) — ela é um painel de
  // altura cheia que desliza. Cai de cima (-100% -> 0%) cobrindo a tela, e
  // ao invés de recolher pra cima ela continua descendo (0% -> 100%) até
  // sair por baixo, sempre no mesmo sentido. Some (idle) já posicionada
  // acima da viewport, pronta pra próxima queda.
  const curtainStyle: CSSProperties = {
    position: "fixed",
    inset: 0,
    background: curtainColor,
    transform:
      phase === "falling" || phase === "covered"
        ? "translateY(0%)"
        : phase === "rising"
          ? "translateY(100%)"
          : "translateY(-100%)",
    transition:
      phase === "falling" || phase === "rising"
        ? `transform ${duration}ms ${EASING}`
        : "none",
    zIndex: 9997,
    pointerEvents: "none",
  };

  return (
    <>
      <div aria-hidden style={curtainStyle} />
      <Button
        variant="ghost"
        size="icon"
        aria-label="Alternar tema"
        onClick={toggle}
        className={cn("relative z-[9999]", className)}
      >
        <Sun className="scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
        <Moon className="absolute scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
      </Button>
    </>
  );
}
