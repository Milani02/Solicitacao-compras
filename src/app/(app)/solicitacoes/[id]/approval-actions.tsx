"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, X } from "lucide-react";
import { aprovar, reprovar } from "@/actions/solicitacoes";
import { Button } from "@/components/ui/button";
import { WetPaintButton } from "@/components/wet-paint-button";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { FieldLabel } from "@/components/ui/field";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { formatCentavos } from "@/lib/format";
import { AnexosThumbnails, type AnexoThumbnail } from "./anexos-thumbnails";

type Fornecedor = {
  id: string;
  nome: string;
  totalCentavos: number;
  fotos: AnexoThumbnail[];
};

function RejeitarDialog({
  onConfirm,
}: {
  onConfirm: (motivo: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <X data-icon="inline-start" />
        Reprovar
      </Button>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reprovar solicitação</AlertDialogTitle>
          <AlertDialogDescription>
            Explique o motivo — o solicitante será notificado por e-mail.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="px-6">
          <FieldLabel htmlFor="motivo" className="sr-only">
            Motivo
          </FieldLabel>
          <Textarea
            id="motivo"
            rows={3}
            placeholder="Descreva o motivo da reprovação"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <Button
            variant="destructive"
            disabled={pending || !motivo.trim()}
            onClick={() =>
              startTransition(async () => {
                await onConfirm(motivo.trim());
                setOpen(false);
              })
            }
          >
            {pending && <Spinner data-icon="inline-start" />}
            Confirmar reprovação
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function ApprovalActions({
  solicitacaoId,
  fornecedores,
}: {
  solicitacaoId: string;
  fornecedores: Fornecedor[];
}) {
  const router = useRouter();
  const [escolhido, setEscolhido] = useState<string>(fornecedores[0]?.id ?? "");
  const [pending, startTransition] = useTransition();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Aprovação</CardTitle>
        <CardDescription>
          Escolha o fornecedor vencedor e aprove, ou reprove com justificativa.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <RadioGroup value={escolhido} onValueChange={(v) => setEscolhido(v as string)}>
          {fornecedores.map((f) => (
            <label
              key={f.id}
              className="flex flex-col gap-3 rounded-lg border p-3 has-data-checked:border-primary/40 has-data-checked:bg-primary/5"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <RadioGroupItem value={f.id} />
                  <span className="text-sm font-medium">{f.nome}</span>
                </div>
                <span className="font-data text-sm text-muted-foreground">
                  {formatCentavos(f.totalCentavos)}
                </span>
              </div>
              {f.fotos.length > 0 && (
                <div className="pl-7">
                  <AnexosThumbnails anexos={f.fotos} />
                </div>
              )}
            </label>
          ))}
        </RadioGroup>

        <div className="flex flex-wrap gap-3">
          <WetPaintButton
            type="button"
            disabled={pending || !escolhido}
            onClick={() =>
              startTransition(async () => {
                const result = await aprovar(solicitacaoId, escolhido);
                if (result?.error) toast.error(result.error);
                else {
                  toast.success("Solicitação aprovada.");
                  router.refresh();
                }
              })
            }
          >
            {pending ? <Spinner className="size-4" /> : <Check className="size-4" />}
            Aprovar com este fornecedor
          </WetPaintButton>
          <RejeitarDialog
            onConfirm={async (motivo) => {
              const result = await reprovar(solicitacaoId, motivo);
              if (result?.error) toast.error(result.error);
              else {
                toast.success("Solicitação reprovada.");
                router.refresh();
              }
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
}
