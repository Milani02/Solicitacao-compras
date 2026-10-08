"use client";

import { useCallback, useMemo } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { STATUS_LABEL } from "@/lib/solicitacoes/status";
import type { StatusSolicitacao } from "@/generated/prisma";

const STATUS_ITEMS = [
  { label: "Todos os status", value: "" },
  ...(Object.keys(STATUS_LABEL) as StatusSolicitacao[]).map((s) => ({
    label: STATUS_LABEL[s],
    value: s,
  })),
];

type Setor = { id: string; nome: string };

export function FiltersBar({ setores }: { setores: Setor[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const status = searchParams.get("status") ?? "";
  const setorId = searchParams.get("setorId") ?? "";
  const de = searchParams.get("de") ?? "";
  const ate = searchParams.get("ate") ?? "";

  const setorItems = useMemo(
    () => [
      { label: "Todos os setores", value: "" },
      ...setores.map((s) => ({ label: s.nome, value: s.id })),
    ],
    [setores]
  );

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

  const hasFilters = status || setorId || de || ate;
  const exportHref = `/api/solicitacoes/export${
    searchParams.toString() ? `?${searchParams.toString()}` : ""
  }`;

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-muted-foreground">Status</label>
        <Select
          items={STATUS_ITEMS}
          value={status}
          onValueChange={(value) => updateParam("status", value as string)}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Todos os status" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {STATUS_ITEMS.map((item) => (
                <SelectItem key={item.value || "all"} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      {setores.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground">Setor</label>
          <Select
            items={setorItems}
            value={setorId}
            onValueChange={(value) => updateParam("setorId", value as string)}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Todos os setores" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {setorItems.map((item) => (
                  <SelectItem key={item.value || "all"} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="filtro-de" className="text-xs font-medium text-muted-foreground">
          De
        </label>
        <Input
          id="filtro-de"
          type="date"
          value={de}
          onChange={(e) => updateParam("de", e.target.value)}
          className="w-40"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="filtro-ate" className="text-xs font-medium text-muted-foreground">
          Até
        </label>
        <Input
          id="filtro-ate"
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
