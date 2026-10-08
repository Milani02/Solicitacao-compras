"use client";

import { useState } from "react";
import { useActionState } from "react";
import { LogIn, Eye, EyeOff } from "lucide-react";
import { login, type LoginState } from "@/actions/auth";
import { WetPaintButton } from "@/components/wet-paint-button";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupInput,
  InputGroupAddon,
  InputGroupButton,
} from "@/components/ui/input-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(
    login,
    undefined
  );
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={action} className="w-full">
      <FieldGroup>
        {next && <input type="hidden" name="next" value={next} />}

        {state?.error && (
          <Alert
            variant="destructive"
            className="animate-in fade-in slide-in-from-top-1 duration-300"
          >
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        )}

        <Field
          data-invalid={!!state?.error}
          className="animate-fade-up transition-transform duration-150 ease-out focus-within:-translate-y-0.5"
          style={{ animationDelay: "260ms" }}
        >
          <FieldLabel htmlFor="email">E-mail</FieldLabel>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            placeholder="voce@biodinamica.com.br"
            required
            aria-invalid={!!state?.error}
          />
        </Field>

        <Field
          data-invalid={!!state?.error}
          className="animate-fade-up transition-transform duration-150 ease-out focus-within:-translate-y-0.5"
          style={{ animationDelay: "330ms" }}
        >
          <FieldLabel htmlFor="password">Senha</FieldLabel>
          <InputGroup>
            <InputGroupInput
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              aria-invalid={!!state?.error}
            />
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                type="button"
                size="icon-xs"
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? <EyeOff /> : <Eye />}
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
        </Field>

        <div className="animate-fade-up" style={{ animationDelay: "400ms" }}>
          <WetPaintButton type="submit" disabled={pending} className="w-full">
            {pending ? <Spinner className="size-4" /> : <LogIn className="size-4" />}
            Entrar
          </WetPaintButton>
        </div>
      </FieldGroup>
    </form>
  );
}
