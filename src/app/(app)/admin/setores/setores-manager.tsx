"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, Building2 } from "lucide-react";
import {
  criarSetor,
  excluirSetor,
  criarCentroCusto,
  excluirCentroCusto,
} from "@/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { FieldLabel } from "@/components/ui/field";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

type CentroCusto = { id: string; codigo: string; descricao: string };
type Setor = {
  id: string;
  nome: string;
  totalUsuarios: number;
  totalSolicitacoes: number;
  centrosCusto: CentroCusto[];
};

function NovoSetorDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      const result = await criarSetor({ nome: nome.trim() });
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Setor criado.");
      setNome("");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Plus data-icon="inline-start" />
        Novo setor
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo setor</DialogTitle>
          <DialogDescription>
            Setores organizam os usuários gestores e os centros de custo.
          </DialogDescription>
        </DialogHeader>
        <div className="px-6">
          <FieldLabel htmlFor="nome-setor">Nome do setor</FieldLabel>
          <Input
            id="nome-setor"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex: Produção"
          />
        </div>
        <DialogFooter>
          <Button disabled={pending || !nome.trim()} onClick={submit}>
            {pending && <Spinner data-icon="inline-start" />}
            Criar setor
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NovoCentroCustoDialog({ setorId }: { setorId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [codigo, setCodigo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      const result = await criarCentroCusto({
        setorId,
        codigo: codigo.trim(),
        descricao: descricao.trim(),
      });
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Centro de custo criado.");
      setCodigo("");
      setDescricao("");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <Plus data-icon="inline-start" />
        Centro de custo
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo centro de custo</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 px-6">
          <div>
            <FieldLabel htmlFor="cc-codigo">Código</FieldLabel>
            <Input
              id="cc-codigo"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              placeholder="CC-001"
            />
          </div>
          <div>
            <FieldLabel htmlFor="cc-descricao">Descrição</FieldLabel>
            <Input
              id="cc-descricao"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex: Manutenção industrial"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            disabled={pending || !codigo.trim() || !descricao.trim()}
            onClick={submit}
          >
            {pending && <Spinner data-icon="inline-start" />}
            Criar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteButton({
  onConfirm,
  label,
}: {
  onConfirm: () => Promise<void>;
  label: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={<Button variant="ghost" size="icon" aria-label={label} />}
      >
        <Trash2 />
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{label}?</AlertDialogTitle>
          <AlertDialogDescription>
            Essa ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-white hover:bg-destructive/90"
            disabled={pending}
            onClick={() => startTransition(onConfirm)}
          >
            {pending && <Spinner data-icon="inline-start" />}
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function SetoresManager({ setores }: { setores: Setor[] }) {
  const router = useRouter();

  async function handleExcluirSetor(id: string) {
    const result = await excluirSetor(id);
    if (result?.error) toast.error(result.error);
    else {
      toast.success("Setor excluído.");
      router.refresh();
    }
  }

  async function handleExcluirCentroCusto(id: string) {
    const result = await excluirCentroCusto(id);
    if (result?.error) toast.error(result.error);
    else {
      toast.success("Centro de custo excluído.");
      router.refresh();
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-end">
        <NovoSetorDialog />
      </div>

      {setores.length === 0 ? (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Building2 />
            </EmptyMedia>
            <EmptyTitle>Nenhum setor cadastrado</EmptyTitle>
            <EmptyDescription>
              Crie o primeiro setor para começar a organizar gestores e centros de custo.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        setores.map((setor) => (
          <Card key={setor.id}>
            <CardHeader className="flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle>{setor.nome}</CardTitle>
                <Badge variant="secondary">{setor.totalUsuarios} usuário(s)</Badge>
                <Badge variant="secondary">
                  {setor.totalSolicitacoes} solicitação(ões)
                </Badge>
              </div>
              <DeleteButton
                label="Excluir setor"
                onConfirm={() => handleExcluirSetor(setor.id)}
              />
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {setor.centrosCusto.length > 0 ? (
                <div className="overflow-hidden rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Código</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead className="w-10" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {setor.centrosCusto.map((cc) => (
                        <TableRow key={cc.id}>
                          <TableCell className="font-data font-medium">{cc.codigo}</TableCell>
                          <TableCell>{cc.descricao}</TableCell>
                          <TableCell>
                            <DeleteButton
                              label="Excluir centro de custo"
                              onConfirm={() => handleExcluirCentroCusto(cc.id)}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Nenhum centro de custo cadastrado neste setor.
                </p>
              )}
              <div>
                <NovoCentroCustoDialog setorId={setor.id} />
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
