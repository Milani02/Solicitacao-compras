const currencyFmt = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function formatCentavos(centavos: number) {
  return currencyFmt.format(centavos / 100);
}

/** Valor unitário a partir do total do item (valor gravado é sempre o total
 * daquele item, não o preço de 1 unidade). */
export function formatCentavosPorUnidade(totalCentavos: number, quantidade: number) {
  if (!quantidade) return formatCentavos(0);
  return formatCentavos(totalCentavos / quantidade);
}

/** Converte texto em formato pt-BR ("1.234,56" ou "1234,56") para centavos. */
export function parseValorParaCentavos(valor: string): number | null {
  const limpo = valor.trim().replace(/\./g, "").replace(",", ".");
  if (limpo === "") return null;
  const num = Number(limpo);
  if (Number.isNaN(num) || num < 0) return null;
  return Math.round(num * 100);
}

const valorMascaraFmt = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Máscara de moeda estilo caixa registradora: os dígitos entram pela
 * direita como centavos ("15990" → "159,90"). Sem isso, quem digitava
 * "15990" pensando em R$ 159,90 gravava R$ 15.990,00. A saída continua
 * no formato que parseValorParaCentavos entende ("1.234,56"). */
export function mascararValor(texto: string): string {
  const digitos = texto.replace(/\D/g, "").replace(/^0+/, "").slice(0, 13);
  if (!digitos) return "";
  return valorMascaraFmt.format(Number(digitos) / 100);
}
