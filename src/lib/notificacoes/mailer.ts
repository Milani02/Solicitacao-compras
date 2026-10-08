import "server-only";
import nodemailer from "nodemailer";

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function smtpConfigured() {
  return Boolean(
    process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD
  );
}

function getTransporter() {
  if (!smtpConfigured()) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: Number(process.env.SMTP_PORT ?? 587) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  }
  return transporter;
}

function destinatarioDeTeste(destinatarioReal: string | string[]) {
  const override = process.env.EMAIL_TESTE_PARA;
  if (!override) return destinatarioReal;
  const real = Array.isArray(destinatarioReal) ? destinatarioReal.join(", ") : destinatarioReal;
  console.log(`[email] Modo de teste ativo — redirecionando de "${real}" para "${override}"`);
  return override.split(",").map((e) => e.trim());
}

export async function enviarEmail(params: {
  to: string | string[];
  subject: string;
  html: string;
}) {
  const to = Array.isArray(params.to) ? params.to.filter(Boolean) : params.to;
  if (!to || (Array.isArray(to) && to.length === 0)) return;

  const t = getTransporter();
  if (!t) {
    console.log(`[email] SMTP não configurado — pulando envio para ${to}: ${params.subject}`);
    return;
  }

  try {
    await t.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: destinatarioDeTeste(to),
      subject: params.subject,
      html: params.html,
    });
  } catch (err) {
    console.error("[email] Falha ao enviar e-mail:", err);
  }
}
