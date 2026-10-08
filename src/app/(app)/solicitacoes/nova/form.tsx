"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Combobox as ComboboxPrimitive } from "@base-ui/react";
import { Plus, Trash2, ImagePlus, X } from "lucide-react";
import { criarSolicitacao } from "@/actions/solicitacoes";
import { enviarAnexoCotacao } from "@/actions/anexos-cotacao";
import {
  NovaSolicitacaoFormSchema,
  type NovaSolicitacaoFormInput,
  type NovaSolicitacaoFormValues,
} from "@/lib/solicitacoes/schemas";
import { parseValorParaCentavos, formatCentavosPorUnidade } from "@/lib/format";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
  ComboboxValue,
} from "@/components/ui/combobox";

type CentroCusto = { id: string; codigo: string; descricao: string };

// crypto.randomUUID() só existe em contexto seguro (HTTPS ou localhost) —
// quebra ao acessar por IP da rede local em HTTP puro. Essas chaves são só
// pra identificar linhas na UI (React key / correlação de upload), não
// precisam de aleatoriedade criptográfica.
function idLocal() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

type PendingFile = { key: string; file: File; previewUrl: string };

type FornecedorState = {
  key: string;
  nome: string;
  telefone: string;
  contato: string;
  valores: Record<string, string>;
  arquivos: PendingFile[];
};

function novoFornecedor(): FornecedorState {
  return {
    key: idLocal(),
    nome: "",
    telefone: "",
    contato: "",
    valores: {},
    arquivos: [],
  };
}

export function NovaSolicitacaoForm({
  setorId,
  centrosCusto,
}: {
  setorId: string;
  centrosCusto: CentroCusto[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [fornecedores, setFornecedores] = useState<FornecedorState[]>([novoFornecedor()]);

  const centroCustoItems = useMemo(
    () =>
      ComboboxPrimitive.createItems(centrosCusto, {
        getValue: (c) => c.id,
        getLabel: (c) => `${c.codigo} — ${c.descricao}`,
      }),
    [centrosCusto]
  );

  const form = useForm<NovaSolicitacaoFormValues, unknown, NovaSolicitacaoFormInput>({
    resolver: zodResolver(NovaSolicitacaoFormSchema),
    defaultValues: {
      setorId,
      centroCustoId: "",
      finalidade: "",
      justificativa: "",
      itens: [{ codigo: "", quantidade: 1, unidade: "", especificacao: "" }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "itens",
  });

  // `fields` só traz a foto inicial (id estável + valores do append/reset);
  // não reflete o que o usuário digita depois via register(). Pra exibir a
  // descrição atualizada na tabela de preços, casamos o id estável de cada
  // field com o valor "ao vivo" do formulário na mesma posição.
  const itensAtuais = form.watch("itens");
  const itensParaExibir = fields.map((field, index) => ({
    id: field.id,
    quantidade: itensAtuais?.[index]?.quantidade,
    unidade: itensAtuais?.[index]?.unidade ?? "",
    especificacao: itensAtuais?.[index]?.especificacao ?? "",
  }));

  function updateFornecedor(index: number, patch: Partial<FornecedorState>) {
    setFornecedores((prev) => prev.map((f, i) => (i === index ? { ...f, ...patch } : f)));
  }

  function addFornecedor() {
    if (fornecedores.length >= 3) return;
    setFornecedores((prev) => [...prev, novoFornecedor()]);
  }

  function removeFornecedor(index: number) {
    setFornecedores((prev) => {
      const alvo = prev[index];
      for (const a of alvo.arquivos) URL.revokeObjectURL(a.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  }

  function addFiles(index: number, fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const novos = Array.from(fileList).map((file) => ({
      key: idLocal(),
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    setFornecedores((prev) =>
      prev.map((f, i) => (i === index ? { ...f, arquivos: [...f.arquivos, ...novos] } : f))
    );
  }

  function removeFile(fIndex: number, fileKey: string) {
    setFornecedores((prev) =>
      prev.map((f, i) => {
        if (i !== fIndex) return f;
        const alvo = f.arquivos.find((a) => a.key === fileKey);
        if (alvo) URL.revokeObjectURL(alvo.previewUrl);
        return { ...f, arquivos: f.arquivos.filter((a) => a.key !== fileKey) };
      })
    );
  }

  function onSubmit(data: NovaSolicitacaoFormInput) {
    const fornecedoresValidos = fornecedores.filter((f) => f.nome.trim());
    if (fornecedoresValidos.length === 0) {
      toast.error("Adicione ao menos um fornecedor com preço ou print do orçamento.");
      return;
    }

    const fornecedoresPayload = fornecedoresValidos.map((f) => ({
      nome: f.nome.trim(),
      telefone: f.telefone.trim(),
      contato: f.contato.trim(),
      cotacoes: fields
        .map((field, itemIndex) => {
          const raw = f.valores[field.id];
          const centavos = raw ? parseValorParaCentavos(raw) : null;
          if (centavos === null) return null;
          return { itemIndex, valorCentavos: centavos };
        })
        .filter((c): c is { itemIndex: number; valorCentavos: number } => c !== null),
    }));

    const semEvidencia = fornecedoresValidos.find(
      (f, i) => fornecedoresPayload[i].cotacoes.length === 0 && f.arquivos.length === 0
    );
    if (semEvidencia) {
      toast.error(
        `Informe o preço ou anexe o print do orçamento de "${semEvidencia.nome.trim()}".`
      );
      return;
    }

    startTransition(async () => {
      const result = await criarSolicitacao({ ...data, fornecedores: fornecedoresPayload });
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      const solicitacaoId = result?.data?.id;
      if (!solicitacaoId) return;

      for (let i = 0; i < fornecedoresValidos.length; i++) {
        for (const anexo of fornecedoresValidos[i].arquivos) {
          const uploadData = new FormData();
          uploadData.set("solicitacaoId", solicitacaoId);
          uploadData.set("fornecedorOrdem", String(i + 1));
          uploadData.set("arquivo", anexo.file);
          const uploadResult = await enviarAnexoCotacao(uploadData);
          if (uploadResult?.error) {
            toast.error(`Falha ao enviar "${anexo.file.name}": ${uploadResult.error}`);
          }
        }
      }

      router.push(`/solicitacoes/${solicitacaoId}`);
    });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Dados da solicitação</CardTitle>
          <CardDescription>
            Centro de custo, finalidade e justificativa da compra.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field data-invalid={!!form.formState.errors.centroCustoId}>
              <FieldLabel htmlFor="centroCustoId">Centro de custo</FieldLabel>
              <Combobox
                items={centroCustoItems}
                value={form.watch("centroCustoId") || null}
                onValueChange={(value) =>
                  form.setValue("centroCustoId", (value as string) ?? "", {
                    shouldValidate: true,
                  })
                }
              >
                <ComboboxTrigger
                  id="centroCustoId"
                  render={
                    <Button variant="outline" className="w-full justify-between font-normal" />
                  }
                >
                  <ComboboxValue placeholder="Selecione o centro de custo" />
                </ComboboxTrigger>
                <ComboboxContent className="w-(--anchor-width)">
                  <ComboboxInput
                    showTrigger={false}
                    placeholder="Buscar centro de custo..."
                  />
                  <ComboboxEmpty>Nenhum centro de custo encontrado.</ComboboxEmpty>
                  <ComboboxList>
                    {(c: CentroCusto) => (
                      <ComboboxItem key={c.id} value={c.id}>
                        {c.codigo} — {c.descricao}
                      </ComboboxItem>
                    )}
                  </ComboboxList>
                </ComboboxContent>
              </Combobox>
              <FieldError errors={[form.formState.errors.centroCustoId]} />
            </Field>

            <Field data-invalid={!!form.formState.errors.finalidade}>
              <FieldLabel htmlFor="finalidade">Finalidade</FieldLabel>
              <Textarea
                id="finalidade"
                rows={2}
                placeholder="Para que essa compra será usada"
                aria-invalid={!!form.formState.errors.finalidade}
                {...form.register("finalidade")}
              />
              <FieldError errors={[form.formState.errors.finalidade]} />
            </Field>

            <Field data-invalid={!!form.formState.errors.justificativa}>
              <FieldLabel htmlFor="justificativa">Justificativa</FieldLabel>
              <Textarea
                id="justificativa"
                rows={3}
                placeholder="Por que essa compra é necessária"
                aria-invalid={!!form.formState.errors.justificativa}
                {...form.register("justificativa")}
              />
              <FieldError errors={[form.formState.errors.justificativa]} />
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Itens</CardTitle>
          <CardDescription>Materiais ou serviços solicitados.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {fields.map((field, index) => {
            const itemErrors = form.formState.errors.itens?.[index];
            return (
              <div
                key={field.id}
                className="grid grid-cols-2 gap-3 rounded-lg border p-3 sm:grid-cols-12"
              >
                <div className="col-span-1 sm:col-span-2">
                  <FieldLabel
                    htmlFor={`itens.${index}.codigo`}
                    className="text-xs text-muted-foreground"
                  >
                    Código
                  </FieldLabel>
                  <Input
                    id={`itens.${index}.codigo`}
                    placeholder="Opcional"
                    {...form.register(`itens.${index}.codigo`)}
                  />
                </div>
                <div className="col-span-1 sm:col-span-2">
                  <FieldLabel
                    htmlFor={`itens.${index}.quantidade`}
                    className="text-xs text-muted-foreground"
                  >
                    Quantidade
                  </FieldLabel>
                  <Input
                    id={`itens.${index}.quantidade`}
                    type="number"
                    step="any"
                    min={0}
                    aria-invalid={!!itemErrors?.quantidade}
                    {...form.register(`itens.${index}.quantidade`)}
                  />
                </div>
                <div className="col-span-1 sm:col-span-2">
                  <FieldLabel
                    htmlFor={`itens.${index}.unidade`}
                    className="text-xs text-muted-foreground"
                  >
                    Unidade
                  </FieldLabel>
                  <Input
                    id={`itens.${index}.unidade`}
                    placeholder="UN, CX, KG..."
                    aria-invalid={!!itemErrors?.unidade}
                    {...form.register(`itens.${index}.unidade`)}
                  />
                </div>
                <div className="col-span-2 sm:col-span-5">
                  <FieldLabel
                    htmlFor={`itens.${index}.especificacao`}
                    className="text-xs text-muted-foreground"
                  >
                    Especificação completa
                  </FieldLabel>
                  <Input
                    id={`itens.${index}.especificacao`}
                    placeholder="Tamanho, marca, cor, modelo..."
                    aria-invalid={!!itemErrors?.especificacao}
                    {...form.register(`itens.${index}.especificacao`)}
                  />
                </div>
                <div className="col-span-2 flex items-end justify-end sm:col-span-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => remove(index)}
                    disabled={fields.length === 1}
                    aria-label="Remover item"
                  >
                    <Trash2 />
                  </Button>
                </div>
                {itemErrors && (
                  <div className="col-span-2 flex flex-col gap-0.5 text-sm text-destructive sm:col-span-12">
                    {itemErrors.quantidade?.message && (
                      <span>{itemErrors.quantidade.message}</span>
                    )}
                    {itemErrors.unidade?.message && <span>{itemErrors.unidade.message}</span>}
                    {itemErrors.especificacao?.message && (
                      <span>{itemErrors.especificacao.message}</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          <Button
            type="button"
            variant="outline"
            onClick={() =>
              append({ codigo: "", quantidade: 1, unidade: "", especificacao: "" })
            }
          >
            <Plus data-icon="inline-start" />
            Adicionar item
          </Button>

          {form.formState.errors.itens?.root && (
            <p className="text-sm text-destructive">
              {form.formState.errors.itens.root.message}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cotação de fornecedores</CardTitle>
          <CardDescription>
            Cadastre até 3 fornecedores com o preço de cada item, ou anexe o print do
            orçamento — a diretoria decide direto com base nisso, sem etapa intermediária.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {fornecedores.map((f, index) => (
            <FornecedorCard
              key={f.key}
              fornecedor={f}
              index={index}
              itens={itensParaExibir}
              podeRemover={fornecedores.length > 1}
              onChange={(patch) => updateFornecedor(index, patch)}
              onRemove={() => removeFornecedor(index)}
              onAddFiles={(fileList) => addFiles(index, fileList)}
              onRemoveFile={(fileKey) => removeFile(index, fileKey)}
            />
          ))}

          {fornecedores.length < 3 && (
            <Button type="button" variant="outline" onClick={addFornecedor}>
              <Plus data-icon="inline-start" />
              Adicionar fornecedor
            </Button>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/solicitacoes")}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={pending}>
          {pending && <Spinner data-icon="inline-start" />}
          Enviar solicitação
        </Button>
      </div>
    </form>
  );
}

function FornecedorCard({
  fornecedor,
  index,
  itens,
  podeRemover,
  onChange,
  onRemove,
  onAddFiles,
  onRemoveFile,
}: {
  fornecedor: FornecedorState;
  index: number;
  itens: { id: string; especificacao: string; quantidade: unknown; unidade: string }[];
  podeRemover: boolean;
  onChange: (patch: Partial<FornecedorState>) => void;
  onRemove: () => void;
  onAddFiles: (fileList: FileList | null) => void;
  onRemoveFile: (fileKey: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-muted-foreground">
          Fornecedor {index + 1}
        </span>
        {podeRemover && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Remover fornecedor"
            onClick={onRemove}
          >
            <Trash2 />
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <FieldLabel htmlFor={`nome-${index}`} className="text-xs text-muted-foreground">
            Nome do fornecedor
          </FieldLabel>
          <Input
            id={`nome-${index}`}
            value={fornecedor.nome}
            onChange={(e) => onChange({ nome: e.target.value })}
            placeholder="Razão social"
          />
        </div>
        <div>
          <FieldLabel htmlFor={`tel-${index}`} className="text-xs text-muted-foreground">
            Telefone
          </FieldLabel>
          <Input
            id={`tel-${index}`}
            value={fornecedor.telefone}
            onChange={(e) => onChange({ telefone: e.target.value })}
            placeholder="(00) 00000-0000"
          />
        </div>
        <div>
          <FieldLabel htmlFor={`contato-${index}`} className="text-xs text-muted-foreground">
            Contato
          </FieldLabel>
          <Input
            id={`contato-${index}`}
            value={fornecedor.contato}
            onChange={(e) => onChange({ contato: e.target.value })}
            placeholder="Nome do vendedor"
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead className="w-36">Valor total (R$)</TableHead>
              <TableHead className="w-32">Valor por unidade</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {itens.map((item) => {
              const raw = fornecedor.valores[item.id] ?? "";
              const centavos = raw ? parseValorParaCentavos(raw) : null;
              const quantidade = Number(item.quantidade) || 0;
              return (
                <TableRow key={item.id}>
                  <TableCell className="text-sm">
                    {String(item.quantidade)} {item.unidade} — {item.especificacao}
                  </TableCell>
                  <TableCell>
                    <Input
                      inputMode="decimal"
                      placeholder="0,00"
                      value={raw}
                      onChange={(e) =>
                        onChange({
                          valores: { ...fornecedor.valores, [item.id]: e.target.value },
                        })
                      }
                    />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {centavos !== null && quantidade > 0
                      ? `${formatCentavosPorUnidade(centavos, quantidade)}/un.`
                      : "—"}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium text-muted-foreground">
          Prints do orçamento (opcional)
        </span>
        <div className="flex flex-wrap gap-2">
          {fornecedor.arquivos.map((a) => (
            <div
              key={a.key}
              className="group relative size-16 shrink-0 overflow-hidden rounded-md border"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={a.previewUrl} alt={a.file.name} className="size-full object-cover" />
              <button
                type="button"
                aria-label="Remover print"
                onClick={() => onRemoveFile(a.key)}
                className="absolute top-0.5 right-0.5 flex size-4 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
              >
                <X className="size-3" />
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex size-16 shrink-0 flex-col items-center justify-center gap-1 rounded-md border border-dashed text-muted-foreground transition-colors hover:bg-muted/50"
          >
            <ImagePlus className="size-4" />
            <span className="text-[10px]">Anexar</span>
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              onAddFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </div>
      </div>
    </div>
  );
}
