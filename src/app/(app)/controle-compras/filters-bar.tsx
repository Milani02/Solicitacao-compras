"use client";

import { useCallback, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Download, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";

export function ControleComprasFiltersBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const de = searchParams.get("de") ?? "";
  const ate = searchParams.get("ate") ?? "";
  const q = searchParams.get("q") ?? "";
  const nf = searchParams.get("nf") ?? "";
  const [busca, setBusca] = useState(q);

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      router.replace(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  const hasFilters = de || ate || q || nf;
  const exportHref = `/api/controle-compras/export${
    searchParams.toString() ? `?${searchParams.toString()}` : ""
  }`;

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="cc-busca" className="text-xs font-medium text-muted-foreground">
          Buscar
        </label>
        <InputGroup className="w-64">
          <InputGroupInput
            id="cc-busca"
            placeholder="Número, requisitante ou fornecedor"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            onBlur={() => updateParam("q", busca)}
            onKeyDown={(e) => {
              if (e.key === "Enter") updateParam("q", busca);
            }}
          />
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
        </InputGroup>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="cc-de" className="text-xs font-medium text-muted-foreground">
          De
        </label>
        <Input
          id="cc-de"
          type="date"
          value={de}
          onChange={(e) => updateParam("de", e.target.value)}
          className="w-40"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="cc-ate" className="text-xs font-medium text-muted-foreground">
          Até
        </label>
        <Input
          id="cc-ate"
          type="date"
          value={ate}
          onChange={(e) => updateParam("ate", e.target.value)}
          className="w-40"
        />
      </div>

      {hasFilters && (
        <Button variant="ghost" onClick={() => router.replace(pathname)}>
          <X data-icon="inline-start" />
          Limpar
        </Button>
      )}

      <Button
        variant="outline"
        className="ml-auto"
        render={<a href={exportHref} />}
        nativeButton={false}
      >
        <Download data-icon="inline-start" />
        Exportar Excel
      </Button>
    </div>
  );
}
