import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export const ANEXOS_COTACAO_BUCKET = "anexos-cotacao";

/** Gera URLs assinadas (1h) para os prints de orçamento — o bucket é
 * privado, então a leitura sempre passa pelo servidor. */
export async function signedUrlsForAnexos(
  paths: string[]
): Promise<Record<string, string>> {
  if (paths.length === 0) return {};

  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(ANEXOS_COTACAO_BUCKET)
    .createSignedUrls(paths, 60 * 60);

  if (error || !data) return {};

  const map: Record<string, string> = {};
  for (const item of data) {
    if (item.path && item.signedUrl) map[item.path] = item.signedUrl;
  }
  return map;
}
