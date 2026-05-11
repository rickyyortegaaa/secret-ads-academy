import { Section, Text } from "@react-email/components";

import {
  BrandedEmailLayout,
  Divider,
  Eyebrow,
  Heading2,
  Paragraph,
  PinkButton,
} from "./components";

export type InvitationEmailProps = {
  recipientName: string;
  appUrl: string;
};

export function InvitationEmail({
  recipientName,
  appUrl,
}: InvitationEmailProps) {
  const firstName = recipientName.trim().split(/\s+/)[0] || "alumno";

  return (
    <BrandedEmailLayout preview="Has sido invitado al examen de certificación de Secret Ads Academy">
      <Eyebrow>Invitación al examen</Eyebrow>
      <Heading2>Hola {firstName} 👋</Heading2>

      <Paragraph>
        Has sido invitado a realizar el <strong>examen de certificación
        oficial de Secret Ads Academy</strong>. Demuestra los conocimientos
        que has adquirido y consigue tu acreditación.
      </Paragraph>

      <Paragraph>
        Para empezar, accede a la plataforma con el email al que has recibido
        este mensaje y regístrate con tu nombre y apellidos:
      </Paragraph>

      <Section className="my-7 text-center">
        <PinkButton href={appUrl}>Empezar mi examen</PinkButton>
      </Section>

      <Section className="my-2 rounded-xl border border-[#FBCFE8] bg-[#FDF2F8] p-5">
        <Text className="m-0 mb-2 text-[12px] font-bold uppercase tracking-[0.2em] text-[#BE185D]">
          Antes de empezar
        </Text>
        <Text className="m-0 text-[14px] leading-[1.6] text-[#27272A]">
          • Busca un sitio tranquilo, sin distracciones.
          <br />
          • Tendrás <strong>60 segundos</strong> por pregunta tipo test y{" "}
          <strong>3 minutos</strong> por pregunta abierta.
          <br />
          • Son <strong>25 preguntas</strong> en total.
          <br />
          • No salgas de la pestaña del examen — los cambios quedan registrados.
        </Text>
      </Section>

      <Divider />

      <Paragraph>
        Si el botón no funciona, copia y pega esta URL en tu navegador:
        <br />
        <a
          href={appUrl}
          style={{ color: "#BE185D", wordBreak: "break-all" }}
        >
          {appUrl}
        </a>
      </Paragraph>

      <Paragraph>
        ¡Mucha suerte!
        <br />
        El equipo de Secret Ads Academy
      </Paragraph>
    </BrandedEmailLayout>
  );
}

InvitationEmail.PreviewProps = {
  recipientName: "Nombre Apellido",
  appUrl: "https://exam.secret-ads.com",
} satisfies InvitationEmailProps;

export default InvitationEmail;
