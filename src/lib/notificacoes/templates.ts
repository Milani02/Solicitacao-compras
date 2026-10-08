/** Escapa texto vindo do usuário (nome, finalidade, motivo etc.) antes de
 * interpolar no HTML do e-mail — evita que alguém injete tags/links via um
 * campo de formulário e o e-mail acabe renderizando HTML arbitrário. */
export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const BRAND_NAVY = "#0b1b33";
const BRAND_OLIVE = "#4b5926";
const BRAND_GOLD = "#c9a227";
const BRAND_PAPER = "#faf9f4";

function logoUrl() {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${base}/logo-biodinamica.png`;
}

type Tone = "success" | "danger" | "warning" | "neutral";

const TONE_STYLES: Record<Tone, { bg: string; fg: string; icon: string }> = {
  success: { bg: "#eaf0e3", fg: BRAND_OLIVE, icon: "&#10003;" }, // ✓
  danger: { bg: "#fbeae9", fg: "#a3342b", icon: "&#10005;" }, // ✕
  warning: { bg: "#faf1dc", fg: "#93731a", icon: "&#8987;" }, // ⏳
  neutral: { bg: "#eef0ea", fg: BRAND_NAVY, icon: "&#8226;" }, // •
};

export function emailShell(params: {
  title: string;
  body: string;
  ctaLabel?: string;
  ctaUrl?: string;
  tone?: Tone;
  badgeLabel?: string;
  meta?: { label: string; value: string }[];
}) {
  const { title, body, ctaLabel, ctaUrl, tone = "neutral", badgeLabel, meta } = params;
  const t = TONE_STYLES[tone];

  const metaRows = meta?.length
    ? `<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;border-top:1px solid #e8e6df;">
        ${meta
          .map(
            (m, i) => `<tr>
              <td style="padding:10px 0;${i > 0 ? "border-top:1px solid #f0efe9;" : ""}font-size:12px;color:#8a8778;width:120px;vertical-align:top;">${m.label}</td>
              <td style="padding:10px 0;${i > 0 ? "border-top:1px solid #f0efe9;" : ""}font-size:13px;color:#2a2a24;font-weight:500;vertical-align:top;">${m.value}</td>
            </tr>`
          )
          .join("")}
      </table>`
    : "";

  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light" />
  </head>
  <body style="margin:0;padding:0;background:${BRAND_PAPER};font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="padding:40px 16px;">
      <tr>
        <td align="center">
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:480px;">
            <tr>
              <td style="height:5px;line-height:5px;font-size:0;border-radius:14px 14px 0 0;overflow:hidden;background:linear-gradient(90deg, ${BRAND_NAVY} 0%, ${BRAND_OLIVE} 55%, ${BRAND_GOLD} 100%);">&nbsp;</td>
            </tr>
          </table>
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:480px;background:#ffffff;border-radius:0 0 14px 14px;overflow:hidden;border:1px solid #eae8e0;border-top:none;box-shadow:0 4px 16px rgba(11,27,51,0.07);">
            <tr>
              <td align="center" style="padding:32px 32px 20px;border-bottom:1px solid #f1f0e9;">
                <img src="${logoUrl()}" width="150" alt="Biodinâmica" style="display:block;width:150px;max-width:60%;height:auto;border:0;outline:none;" />
                <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#a3a08f;font-weight:600;margin-top:14px;">Solicitação de Compras</div>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 32px 32px;">
                ${
                  badgeLabel
                    ? `<table cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:16px;">
                        <tr>
                          <td style="background:${t.bg};color:${t.fg};font-size:12px;font-weight:700;letter-spacing:0.02em;padding:6px 14px;border-radius:999px;">
                            <span style="margin-right:6px;">${t.icon}</span>${badgeLabel}
                          </td>
                        </tr>
                      </table>`
                    : ""
                }
                <h1 style="margin:0 0 12px;font-size:20px;line-height:1.35;color:#1a1a15;font-weight:700;">${title}</h1>
                <div style="font-size:14px;line-height:1.65;color:#4a4a3f;">${body}</div>
                ${metaRows}
                ${
                  ctaLabel && ctaUrl
                    ? `<table cellpadding="0" cellspacing="0" role="presentation" style="margin-top:26px;">
                        <tr>
                          <td style="background:${BRAND_NAVY};border-radius:9px;">
                            <a href="${ctaUrl}" style="display:inline-block;color:#ffffff;text-decoration:none;padding:12px 22px;font-size:14px;font-weight:600;">${ctaLabel} &rarr;</a>
                          </td>
                        </tr>
                      </table>`
                    : ""
                }
              </td>
            </tr>
          </table>
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:480px;margin-top:20px;">
            <tr>
              <td align="center" style="font-size:11px;line-height:1.6;color:#b3b0a3;">
                Mensagem automática do sistema de Solicitação de Compras — Biodinâmica<br/>
                Não é necessário responder este e-mail.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
