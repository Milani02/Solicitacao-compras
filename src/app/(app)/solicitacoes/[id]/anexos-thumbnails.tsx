export type AnexoThumbnail = { id: string; url: string; nomeArquivo: string };

export function AnexosThumbnails({ anexos }: { anexos: AnexoThumbnail[] }) {
  if (anexos.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {anexos.map((a) => (
        <a
          key={a.id}
          href={a.url}
          target="_blank"
          rel="noreferrer"
          className="block size-14 shrink-0 overflow-hidden rounded-md border transition-opacity hover:opacity-80"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={a.url} alt={a.nomeArquivo} className="size-full object-cover" />
        </a>
      ))}
    </div>
  );
}
