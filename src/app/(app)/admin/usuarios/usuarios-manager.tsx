"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, KeyRound, Copy, Users, Pencil, Eye, EyeOff } from "lucide-react";
import {
  criarUsuario,
  alternarAtivoUsuario,
  resetarSenhaUsuario,
  atualizarCredenciaisUsuario,
} from "@/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupInput,
  InputGroupAddon,
  InputGroupButton,
} from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { FieldLabel } from "@/components/ui/field";
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
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import type { Role } from "@/generated/prisma";

// navigator.clipboard só existe em contexto seguro (HTTPS ou localhost) —
// no acesso pelo IP da rede local em HTTP puro ela nem existe, e chamar
// direto quebra a tela. Cai pro método antigo (execCommand) nesse caso.
async function copiarParaAreaDeTransferencia(texto: string): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(texto);
      return true;
    } catch {
      // segue pro fallback abaixo
    }
  }
  try {
    const textarea = document.createElement("textarea");
    textarea.value = texto;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const copiou = document.execCommand("copy");
    document.body.removeChild(textarea);
    return copiou;
  } catch {
    return false;
  }
}

type Usuario = {
  id: string;
  nome: string;
  email: string;
  role: Role;
  ativo: boolean;
  setorNome: string | null;
};
type Setor = { id: string; nome: string };

const ROLE_LABEL: Record<Role, string> = {
  GESTOR: "Gestor de setor",
  DIRETORIA: "Diretoria",
  ADMIN: "Administrador (TI)",
};

const ROLE_BADGE: Record<Role, string> = {
  GESTOR: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-400",
  DIRETORIA:
    "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-400",
  ADMIN: "border-primary/30 bg-primary/10 text-primary",
};

function SenhaGeradaDialog({
  open,
  onOpenChange,
  senha,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  senha: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Senha gerada</DialogTitle>
          <DialogDescription>
            Copie e envie essa senha temporária ao usuário. Ela não será exibida novamente.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2 px-6">
          <Input readOnly value={senha} className="font-mono" />
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Copiar senha"
            onClick={async () => {
              const copiou = await copiarParaAreaDeTransferencia(senha);
              if (copiou) {
                toast.success("Senha copiada.");
              } else {
                toast.error(
                  "Não foi possível copiar automaticamente. Selecione e copie manualmente."
                );
              }
            }}
          >
            <Copy />
          </Button>
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Concluído</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditarCredenciaisDialog({
  usuario,
  onOpenChange,
}: {
  usuario: Usuario | null;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [email, setEmail] = useState(usuario?.email ?? "");
  const [novaSenha, setNovaSenha] = useState("");
  const [showSenha, setShowSenha] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit() {
    if (!usuario) return;
    startTransition(async () => {
      const result = await atualizarCredenciaisUsuario({
        id: usuario.id,
        email: email.trim(),
        novaSenha: novaSenha || undefined,
      });
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Credenciais atualizadas.");
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog
      open={!!usuario}
      onOpenChange={(v) => {
        if (!v) onOpenChange(false);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar acesso — {usuario?.nome}</DialogTitle>
          <DialogDescription>
            Altere o e-mail de login e, se quiser, defina uma nova senha. Deixe a senha em
            branco para não alterá-la.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 px-6">
          <div>
            <FieldLabel htmlFor="edit-email">E-mail</FieldLabel>
            <Input
              id="edit-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <FieldLabel htmlFor="edit-senha">Nova senha (opcional)</FieldLabel>
            <InputGroup>
              <InputGroupInput
                id="edit-senha"
                type={showSenha ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Deixe em branco para não alterar"
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
              />
              <InputGroupAddon align="inline-end">
                <InputGroupButton
                  type="button"
                  size="icon-xs"
                  aria-label={showSenha ? "Ocultar senha" : "Mostrar senha"}
                  onClick={() => setShowSenha((v) => !v)}
                >
                  {showSenha ? <EyeOff /> : <Eye />}
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
          </div>
        </div>
        <DialogFooter>
          <Button disabled={pending || !email.trim()} onClick={submit}>
            {pending && <Spinner data-icon="inline-start" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NovoUsuarioDialog({
  setores,
  onCreated,
}: {
  setores: Setor[];
  onCreated: (senha: string) => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("GESTOR");
  const [setorId, setSetorId] = useState("");
  const [pending, startTransition] = useTransition();

  const roleItems = [
    { label: "Gestor de setor", value: "GESTOR" },
    { label: "Diretoria", value: "DIRETORIA" },
    { label: "Administrador (TI)", value: "ADMIN" },
  ];
  const setorItems = [
    { label: "Selecione o setor", value: "" },
    ...setores.map((s) => ({ label: s.nome, value: s.id })),
  ];

  function reset() {
    setNome("");
    setEmail("");
    setRole("GESTOR");
    setSetorId("");
  }

  function submit() {
    startTransition(async () => {
      const result = await criarUsuario({
        nome: nome.trim(),
        email: email.trim(),
        role,
        setorId: role === "GESTOR" ? setorId : undefined,
      });
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Usuário criado.");
      setOpen(false);
      reset();
      router.refresh();
      if (result?.data) onCreated(result.data.senha);
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger render={<Button />}>
        <Plus data-icon="inline-start" />
        Novo usuário
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo usuário</DialogTitle>
          <DialogDescription>
            Uma senha temporária será gerada — repasse ao usuário para o primeiro acesso.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 px-6">
          <div>
            <FieldLabel htmlFor="user-nome">Nome completo</FieldLabel>
            <Input id="user-nome" value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div>
            <FieldLabel htmlFor="user-email">E-mail</FieldLabel>
            <Input
              id="user-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <FieldLabel htmlFor="user-role">Papel</FieldLabel>
            <Select
              items={roleItems}
              value={role}
              onValueChange={(v) => setRole(v as Role)}
            >
              <SelectTrigger id="user-role" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {roleItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          {role === "GESTOR" && (
            <div>
              <FieldLabel htmlFor="user-setor">Setor</FieldLabel>
              <Select
                items={setorItems}
                value={setorId}
                onValueChange={(v) => setSetorId(v as string)}
              >
                <SelectTrigger id="user-setor" className="w-full">
                  <SelectValue placeholder="Selecione o setor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {setores.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.nome}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button
            disabled={
              pending ||
              !nome.trim() ||
              !email.trim() ||
              (role === "GESTOR" && !setorId)
            }
            onClick={submit}
          >
            {pending && <Spinner data-icon="inline-start" />}
            Criar usuário
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function UsuariosManager({
  currentUserId,
  usuarios,
  setores,
}: {
  currentUserId: string;
  usuarios: Usuario[];
  setores: Setor[];
}) {
  const router = useRouter();
  const [senhaDialog, setSenhaDialog] = useState<{ open: boolean; senha: string }>({
    open: false,
    senha: "",
  });
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<Usuario | null>(null);

  async function handleToggleAtivo(id: string, ativo: boolean) {
    setPendingId(id);
    const result = await alternarAtivoUsuario(id, ativo);
    setPendingId(null);
    if (result?.error) toast.error(result.error);
    else {
      toast.success(ativo ? "Usuário ativado." : "Usuário desativado.");
      router.refresh();
    }
  }

  async function handleResetarSenha(id: string) {
    setPendingId(id);
    const result = await resetarSenhaUsuario(id);
    setPendingId(null);
    if (result?.error) toast.error(result.error);
    else if (result?.data) {
      setSenhaDialog({ open: true, senha: result.data.senha });
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-end">
        <NovoUsuarioDialog
          setores={setores}
          onCreated={(senha) => setSenhaDialog({ open: true, senha })}
        />
      </div>

      {usuarios.length === 0 ? (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Users />
            </EmptyMedia>
            <EmptyTitle>Nenhum usuário cadastrado</EmptyTitle>
            <EmptyDescription>Crie o primeiro usuário do sistema.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Papel</TableHead>
                <TableHead>Setor</TableHead>
                <TableHead>Ativo</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {usuarios.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.nome}</TableCell>
                  <TableCell className="text-muted-foreground">{u.email}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={ROLE_BADGE[u.role]}>
                      {ROLE_LABEL[u.role]}
                    </Badge>
                  </TableCell>
                  <TableCell>{u.setorNome ?? "—"}</TableCell>
                  <TableCell>
                    <Switch
                      checked={u.ativo}
                      disabled={pendingId === u.id || u.id === currentUserId}
                      onCheckedChange={(v) => handleToggleAtivo(u.id, v)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Editar e-mail e senha"
                        disabled={pendingId === u.id}
                        onClick={() => setEditingUser(u)}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Gerar senha aleatória"
                        disabled={pendingId === u.id}
                        onClick={() => handleResetarSenha(u.id)}
                      >
                        <KeyRound />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <SenhaGeradaDialog
        open={senhaDialog.open}
        onOpenChange={(v) => setSenhaDialog((s) => ({ ...s, open: v }))}
        senha={senhaDialog.senha}
      />

      <EditarCredenciaisDialog
        key={editingUser?.id ?? "none"}
        usuario={editingUser}
        onOpenChange={(v) => {
          if (!v) setEditingUser(null);
        }}
      />
    </div>
  );
}
