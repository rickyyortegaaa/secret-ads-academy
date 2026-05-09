import { Section, Text } from "@react-email/components";

import {
  BrandedEmailLayout,
  Divider,
  Eyebrow,
  Heading2,
  Paragraph,
  PinkButton,
} from "./components";

export type AdminInvitationEmailProps = {
  recipientName: string;
  inviterEmail: string;
  setupUrl: string;
};

export function AdminInvitationEmail({
  recipientName,
  inviterEmail,
  setupUrl,
}: AdminInvitationEmailProps) {
  const firstName = recipientName.trim().split(/\s+/)[0] || "compañero";

  return (
    <BrandedEmailLayout preview="Has sido invitado al panel de administración de Secret Ads Academy">
      <Eyebrow>Invitación al equipo</Eyebrow>
      <Heading2>Hola {firstName} 👋</Heading2>

      <Paragraph>
        <strong>{inviterEmail}</strong> te ha invitado a unirte al panel de
        administración de <strong>Secret Ads Academy</strong>. Como admin
        podrás gestionar el banco de preguntas, la whitelist de alumnos, los
        intentos de examen, los settings de la plataforma y enviar
        certificados.
      </Paragraph>

      <Paragraph>
        Para activar tu cuenta, elige una contraseña haciendo click en el
        botón:
      </Paragraph>

      <Section className="my-7 text-center">
        <PinkButton href={setupUrl}>Activar mi cuenta</PinkButton>
      </Section>

      <Section className="my-2 rounded-xl border border-[#FBCFE8] bg-[#FDF2F8] p-5">
        <Text className="m-0 mb-2 text-[12px] font-bold uppercase tracking-[0.2em] text-[#BE185D]">
          Importante
        </Text>
        <Text className="m-0 text-[14px] leading-[1.6] text-[#27272A]">
          • Este enlace caduca en <strong>7 días</strong>.
          <br />
          • Solo puede usarse <strong>una vez</strong>.
          <br />
          • Tu contraseña debe tener al menos <strong>10 caracteres</strong>.
          <br />• Si no esperabas esta invitación, ignora este email.
        </Text>
      </Section>

      <Divider />

      <Paragraph>
        Si el botón no funciona, copia y pega esta URL en tu navegador:
        <br />
        <a
          href={setupUrl}
          style={{ color: "#BE185D", wordBreak: "break-all" }}
        >
          {setupUrl}
        </a>
      </Paragraph>

      <Paragraph>
        ¡Bienvenido al equipo!
        <br />
        Secret Ads Academy
      </Paragraph>
    </BrandedEmailLayout>
  );
}

AdminInvitationEmail.PreviewProps = {
  recipientName: "Pat Lopez",
  inviterEmail: "ricky@secretadsacademy.com",
  setupUrl: "https://exam.secret-ads.com/admin/setup?token=abc123",
} satisfies AdminInvitationEmailProps;

export default AdminInvitationEmail;
