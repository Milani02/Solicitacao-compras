import Image from "next/image";
import { redirect } from "next/navigation";
import { ShieldCheck, Users2 } from "lucide-react";
import { getCurrentProfile } from "@/lib/auth/dal";
import { ThemeToggle } from "@/components/theme-toggle";
import { LoginForm } from "./login-form";
import { TypewriterQuote } from "./typewriter-quote";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  const profile = await getCurrentProfile();
  if (profile) redirect("/");

  return (
    <div className="relative grid min-h-dvh lg:grid-cols-12">
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      <div className="relative flex items-center justify-center overflow-hidden p-6 sm:p-10 lg:col-span-5">
        <div
          aria-hidden
          className="animate-drift pointer-events-none absolute -top-24 -left-24 size-72 rounded-full bg-primary/10 blur-[80px]"
          style={{ animationDuration: "26s" }}
        />

        <div
          className="animate-fade-up relative z-10 w-full max-w-sm"
          style={{ animationDelay: "120ms" }}
        >
          <div className="mb-8 lg:hidden">
            <Image
              src="/logo-biodinamica.png"
              alt="Biodinâmica"
              width={220}
              height={88}
              priority
              className="h-10 w-auto object-contain"
            />
          </div>

          <div className="mb-8 flex flex-col gap-2">
            <h1 className="font-display text-2xl font-medium italic">Entrar na sua conta</h1>
            <p className="text-sm text-muted-foreground">
              Use o e-mail e senha cadastrados pelo seu administrador.
            </p>
          </div>

          <LoginForm next={next} />
        </div>
      </div>

      <div className="relative hidden lg:col-span-7 flex-col justify-between overflow-hidden p-10 text-white lg:flex xl:p-14">
        {/* Camada só da imagem — o filtro de tema fica isolado aqui, sem
            afetar o texto/ícones por cima (que herdariam o hue-rotate). */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-no-repeat transition-[filter] duration-500 dark:brightness-90 dark:saturate-150 dark:hue-rotate-[190deg]"
          style={{
            backgroundImage: "url(/login-astronaut.png)",
            backgroundSize: "42%",
            backgroundPosition: "100% 78%",
          }}
        />
        {/* Sombra mais forte no claro — a imagem fica mais "estourada" sem o
            escurecimento do modo escuro, então o texto branco precisa de
            mais contraste aqui. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/95 via-black/55 to-black/75 dark:from-black/80 dark:via-black/20 dark:to-black/50"
        />

        <div className="animate-fade-up relative z-10">
          <Image
            src="/logo-biodinamica-branca.png"
            alt="Biodinâmica"
            width={320}
            height={128}
            priority
            className="h-16 w-auto object-contain xl:h-20"
          />
        </div>

        <div className="relative z-10 flex max-w-lg flex-col gap-10">
          <div
            className="animate-fade-up flex flex-col gap-5"
            style={{ animationDelay: "80ms" }}
          >
            <span className="font-data text-xs tracking-[0.2em] text-white/50 uppercase">
              Sistema interno · Compras
            </span>
            <h1 className="font-display text-4xl leading-[1.08] font-medium text-balance xl:text-5xl">
              Da requisição à aprovação, sem ruído.
            </h1>
            <p className="max-w-md text-base leading-relaxed text-white/65 text-balance">
              O fluxo de solicitação de compras da Biodinâmica — do pedido do
              gestor à aprovação da diretoria — em um só lugar, com histórico
              completo de cada decisão.
            </p>
          </div>

          <div
            className="animate-fade-up flex flex-col gap-4 text-sm"
            style={{ animationDelay: "160ms" }}
          >
            <div className="flex items-start gap-3">
              <Users2 className="mt-0.5 size-4 shrink-0 text-brand-gold" />
              <span className="text-white/70">
                Gestores solicitam, diretoria aprova — tudo rastreado por
                setor e centro de custo.
              </span>
            </div>
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-brand-gold" />
              <span className="text-white/70">
                Cotações, aprovações e histórico completo de cada
                solicitação.
              </span>
            </div>
          </div>
        </div>

        <div
          className="animate-fade-up relative z-10 flex flex-col gap-4"
          style={{ animationDelay: "220ms" }}
        >
          <TypewriterQuote />

          <div className="flex items-center gap-4">
            <div
              className="animate-shade-reveal h-1.5 w-24 rounded-full bg-brand-swatch"
              style={{ animationDelay: "340ms" }}
            />
            <p className="font-data text-[11px] tracking-wide text-white/40 uppercase">
              Uso interno — Biodinâmica
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
