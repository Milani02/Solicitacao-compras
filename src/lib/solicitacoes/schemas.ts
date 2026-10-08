import * as z from "zod";

export const ItemSchema = z.object({
  codigo: z.string().trim().optional(),
  quantidade: z.coerce.number({ error: "Informe a quantidade." }).positive({
    error: "Quantidade deve ser maior que zero.",
  }),
  unidade: z.string().trim().min(1, { error: "Informe a unidade." }),
  especificacao: z
    .string()
    .trim()
    .min(3, { error: "Descreva o material ou serviço." }),
});

// Cotação de um fornecedor referenciando o item pela posição no array
// `itens` do mesmo payload — os itens ainda não têm id real (só são
// criados junto com a solicitação, na mesma transação).
export const FornecedorInputSchema = z.object({
  nome: z.string().trim().min(1, { error: "Informe o nome do fornecedor." }),
  telefone: z.string().trim().optional(),
  contato: z.string().trim().optional(),
  cotacoes: z.array(
    z.object({
      itemIndex: z.number().int().min(0),
      valorCentavos: z.coerce
        .number({ error: "Informe o valor." })
        .int()
        .min(0),
    })
  ),
});

// Só os campos que o react-hook-form de fato controla (itens inclusos, via
// useFieldArray). Fornecedores/prints ficam num useState à parte no
// formulário — não são um "field" do RHF — então não podem entrar no
// schema usado pelo zodResolver, senão a validação nunca fecha (o valor
// ali seria sempre o default, nunca o que o usuário preencheu) e o submit
// falha em silêncio, sem chamar onSubmit nem mostrar nenhum erro.
export const NovaSolicitacaoFormSchema = z.object({
  setorId: z.uuid({ error: "Selecione o setor." }),
  centroCustoId: z.uuid({ error: "Selecione o centro de custo." }),
  finalidade: z
    .string()
    .trim()
    .min(3, { error: "Descreva a finalidade da compra." }),
  justificativa: z
    .string()
    .trim()
    .min(3, { error: "Descreva a justificativa." }),
  itens: z
    .array(ItemSchema)
    .min(1, { error: "Adicione pelo menos um item." }),
});

export type NovaSolicitacaoFormInput = z.infer<typeof NovaSolicitacaoFormSchema>;
export type NovaSolicitacaoFormValues = z.input<typeof NovaSolicitacaoFormSchema>;

// Schema completo, validado no servidor (criarSolicitacao) — o cliente monta
// o array de fornecedores manualmente e anexa ao payload antes de enviar.
export const NovaSolicitacaoSchema = NovaSolicitacaoFormSchema.extend({
  fornecedores: z
    .array(FornecedorInputSchema)
    .min(1, { error: "Adicione ao menos um fornecedor com preço ou print do orçamento." })
    .max(3, { error: "No máximo 3 fornecedores." }),
});

export type NovaSolicitacaoInput = z.infer<typeof NovaSolicitacaoSchema>;
