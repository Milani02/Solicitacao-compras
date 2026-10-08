import { Skeleton } from "@/components/ui/skeleton";

export default function NovaSolicitacaoLoading() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-4 w-40" />
      </div>
      <Skeleton className="h-96 rounded-xl" />
    </div>
  );
}
