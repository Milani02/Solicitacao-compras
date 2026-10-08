"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Ban, CheckCircle2 } from "lucide-react";
import { cancelar, concluir as concluirAction } from "@/actions/solicitacoes";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

export function RequestActions({
  solicitacaoId,
  concluir = false,
}: {
  solicitacaoId: string;
  concluir?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (concluir) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Finalização</CardTitle>
          <CardDescription>
            Marque como concluída quando a compra for efetivamente realizada.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await concluirAction(solicitacaoId);
                if (result?.error) toast.error(result.error);
                else {
                  toast.success("Solicitação concluída.");
                  router.refresh();
                }
              })
            }
          >
            {pending ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <CheckCircle2 data-icon="inline-start" />
            )}
            Concluir compra
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant="outline" />}>
        <Ban data-icon="inline-start" />
        Cancelar solicitação
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancelar esta solicitação?</AlertDialogTitle>
          <AlertDialogDescription>
            Essa ação não pode ser desfeita. A solicitação será marcada como
            cancelada.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Voltar</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-white hover:bg-destructive/90"
            onClick={() =>
              startTransition(async () => {
                const result = await cancelar(solicitacaoId);
                if (result?.error) toast.error(result.error);
                else {
                  toast.success("Solicitação cancelada.");
                  router.refresh();
                }
              })
            }
          >
            {pending && <Spinner data-icon="inline-start" />}
            Confirmar cancelamento
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
