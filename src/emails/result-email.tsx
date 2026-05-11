import { Section, Text } from "@react-email/components";

import {
  BrandedEmailLayout,
  Divider,
  Eyebrow,
  Heading2,
  Paragraph,
  PinkButton,
} from "./components";

export type ResultEmailProps = {
  recipientName: string;
  score: number;
  passed: boolean;
  passThreshold: number;
  appUrl: string;
  certificateUrl?: string | null;
};

export function ResultEmail({
  recipientName,
  score,
  passed,
  passThreshold,
  appUrl,
  certificateUrl,
}: ResultEmailProps) {
  const firstName = recipientName.trim().split(/\s+/)[0] || "alumno";
  const headline = passed
    ? "¡Has superado el examen!"
    : "Tu examen ha sido corregido";
  const eyebrow = passed ? "Aprobado" : "No aprobado";
  const eyebrowColor = passed ? "#15803D" : "#BE123C";
  const scoreColor = passed ? "#15803D" : "#BE123C";

  return (
    <BrandedEmailLayout
      preview={
        passed
          ? `${firstName}, has aprobado con ${score.toFixed(0)}%`
          : `${firstName}, tu nota: ${score.toFixed(0)}%`
      }
    >
      <Text
        className="m-0 mb-2 text-[11px] font-bold uppercase tracking-[0.3em]"
        style={{ color: eyebrowColor }}
      >
        {eyebrow}
      </Text>
      <Heading2>{headline}</Heading2>

      <Paragraph>
        Hola {firstName}, ya hemos corregido tu examen de certificación. Estos
        son los resultados:
      </Paragraph>

      <Section className="my-6 rounded-2xl border-2 border-[#FBCFE8] bg-[#FDF2F8] p-8 text-center">
        <Text className="m-0 mb-1 text-[11px] font-bold uppercase tracking-[0.25em] text-[#BE185D]">
          Tu nota
        </Text>
        <Text
          className="m-0 font-serif font-bold leading-none"
          style={{
            fontSize: "64px",
            color: scoreColor,
          }}
        >
          {score.toFixed(0)}
          <span style={{ fontSize: "32px" }}>%</span>
        </Text>
        <Text className="mt-3 text-[13px] text-[#52525B]">
          Umbral de aprobado: {passThreshold}%
        </Text>
      </Section>

      {passed ? (
        <>
          <Paragraph>
            Has demostrado dominar los conceptos del examen.{" "}
            {certificateUrl ? (
              <>
                Hemos generado tu certificado oficial — descárgalo desde el
                botón de abajo.
              </>
            ) : (
              <>
                Tu certificado estará disponible próximamente desde tu cuenta.
              </>
            )}
          </Paragraph>
          {certificateUrl ? (
            <Section className="my-6 text-center">
              <PinkButton href={certificateUrl}>
                Descargar certificado
              </PinkButton>
            </Section>
          ) : null}
        </>
      ) : (
        <Paragraph>
          Esta vez no se ha alcanzado el umbral mínimo, pero no te preocupes —
          puedes revisar tus respuestas y el feedback detallado en la
          plataforma. Si la academia te lo permite, podrás reintentarlo.
        </Paragraph>
      )}

      <Section className="my-4 text-center">
        <PinkButton href={`${appUrl}/exam`}>
          Ver detalle pregunta a pregunta
        </PinkButton>
      </Section>

      <Divider />

      <Paragraph>
        Gracias por completar tu certificación.
        <br />
        El equipo de Secret Ads Academy
      </Paragraph>
    </BrandedEmailLayout>
  );
}

ResultEmail.PreviewProps = {
  recipientName: "Nombre Apellido",
  score: 84,
  passed: true,
  passThreshold: 70,
  appUrl: "https://exam.secret-ads.com",
  certificateUrl: "https://exam.secret-ads.com/exam/certificate",
} satisfies ResultEmailProps;

export default ResultEmail;
