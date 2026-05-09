import "server-only";

import { Resend } from "resend";

import { InvitationEmail } from "@/emails/invitation-email";
import { ResultEmail } from "@/emails/result-email";
import { AdminInvitationEmail } from "@/emails/admin-invitation-email";

/* ------------------------------------------------------------------ */
/*  Resend client (lazy)                                               */
/* ------------------------------------------------------------------ */

let _client: Resend | null = null;

function getClient(): Resend {
  if (_client) return _client;
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    throw new Error("RESEND_API_KEY no está configurado");
  }
  _client = new Resend(key);
  return _client;
}

function getFrom(): string {
  return (
    process.env.EMAIL_FROM ||
    "Secret Ads Academy <results@exam.secret-ads.com>"
  );
}

function getAppUrl(): string {
  return (
    process.env.PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "https://exam.secret-ads.com"
  );
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

export type SendEmailResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

export async function sendInvitationEmail(input: {
  to: string;
  recipientName: string;
}): Promise<SendEmailResult> {
  try {
    const client = getClient();
    const appUrl = getAppUrl();

    const { data, error } = await client.emails.send({
      from: getFrom(),
      to: input.to,
      subject: "Has sido invitado al examen de certificación de Secret Ads Academy",
      react: InvitationEmail({
        recipientName: input.recipientName,
        appUrl,
      }),
    });

    if (error) {
      console.error("sendInvitationEmail error", error);
      return { ok: false, error: error.message ?? "Error enviando email" };
    }

    return { ok: true, id: data?.id ?? "" };
  } catch (err) {
    console.error("sendInvitationEmail exception", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Error desconocido",
    };
  }
}

export async function sendAdminInvitationEmail(input: {
  to: string;
  recipientName: string;
  inviterEmail: string;
  token: string;
}): Promise<SendEmailResult> {
  try {
    const client = getClient();
    const appUrl = getAppUrl();
    const setupUrl = `${appUrl}/admin/setup?token=${encodeURIComponent(input.token)}`;

    const { data, error } = await client.emails.send({
      from: getFrom(),
      to: input.to,
      subject:
        "Invitación al equipo de admins de Secret Ads Academy",
      react: AdminInvitationEmail({
        recipientName: input.recipientName,
        inviterEmail: input.inviterEmail,
        setupUrl,
      }),
    });

    if (error) {
      console.error("sendAdminInvitationEmail error", error);
      return { ok: false, error: error.message ?? "Error enviando email" };
    }
    return { ok: true, id: data?.id ?? "" };
  } catch (err) {
    console.error("sendAdminInvitationEmail exception", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Error desconocido",
    };
  }
}

export async function sendResultEmail(input: {
  to: string;
  recipientName: string;
  score: number;
  passed: boolean;
  passThreshold: number;
  /** Si quieres incluir botón 'descargar certificado'. Solo si passed. */
  certificateUrl?: string | null;
}): Promise<SendEmailResult> {
  try {
    const client = getClient();
    const appUrl = getAppUrl();

    const subject = input.passed
      ? `¡Has aprobado! ${input.score.toFixed(0)}% — Secret Ads Academy`
      : `Resultado de tu examen — Secret Ads Academy`;

    const { data, error } = await client.emails.send({
      from: getFrom(),
      to: input.to,
      subject,
      react: ResultEmail({
        recipientName: input.recipientName,
        score: input.score,
        passed: input.passed,
        passThreshold: input.passThreshold,
        appUrl,
        certificateUrl: input.certificateUrl ?? null,
      }),
    });

    if (error) {
      console.error("sendResultEmail error", error);
      return { ok: false, error: error.message ?? "Error enviando email" };
    }

    return { ok: true, id: data?.id ?? "" };
  } catch (err) {
    console.error("sendResultEmail exception", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Error desconocido",
    };
  }
}
