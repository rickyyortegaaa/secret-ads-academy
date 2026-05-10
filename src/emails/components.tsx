import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";

function getLogoUrl(): string {
  const base =
    process.env.PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "https://exam.secret-ads.com";
  return `${base}/logo.png`;
}

/**
 * Branded email layout for Secret Ads Academy.
 * - Pink gradient accent bar at top.
 * - Wordmark "Secret Ads · ACADEMY".
 * - Constrained to 600px (email-safe).
 * - Tailwind via @react-email/components — works across Gmail/Outlook/Apple Mail.
 */
export function BrandedEmailLayout({
  preview,
  children,
}: {
  preview: string;
  children: React.ReactNode;
}) {
  return (
    <Html lang="es">
      <Head />
      <Preview>{preview}</Preview>
      <Tailwind>
        <Body className="bg-[#FAF8F6] py-8 font-sans">
          <Container className="mx-auto max-w-[600px] overflow-hidden rounded-2xl border border-[#FBCFE8] bg-white shadow-sm">
            {/* Top brand band — pink gradient */}
            <Section
              className="px-8 py-1"
              style={{
                background:
                  "linear-gradient(90deg, #EC4899 0%, #BE185D 50%, #831843 100%)",
              }}
            >
              <Text className="m-0 py-3 text-center text-[10px] font-bold uppercase tracking-[0.4em] text-white">
                Secret Ads · Academy
              </Text>
            </Section>

            {/* Logo lockup */}
            <Section className="px-8 pt-8 pb-2 text-center">
              <Img
                src={getLogoUrl()}
                alt="Secret Ads Academy"
                width="200"
                height="200"
                style={{
                  display: "block",
                  margin: "0 auto",
                  maxWidth: "200px",
                  height: "auto",
                }}
              />
            </Section>

            {/* Body */}
            <Section className="px-8 pb-10 pt-2">{children}</Section>

            {/* Footer */}
            <Section className="border-t border-[#F4F4F5] bg-[#FAFAFA] px-8 py-6 text-center">
              <Text className="m-0 text-[11px] text-[#71717A]">
                Plataforma oficial de certificación de Secret Ads Academy
              </Text>
              <Text className="mt-1 text-[10px] text-[#A1A1AA]">
                Si no esperabas este email, puedes ignorarlo sin problema.
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

export function PinkButton({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      style={{
        display: "inline-block",
        background:
          "linear-gradient(90deg, #EC4899 0%, #BE185D 100%)",
        color: "#FFFFFF",
        padding: "14px 28px",
        borderRadius: "9999px",
        fontWeight: 600,
        fontSize: "14px",
        textDecoration: "none",
        boxShadow: "0 4px 12px rgba(236, 72, 153, 0.25)",
      }}
    >
      {children}
    </a>
  );
}

export function Heading2({ children }: { children: React.ReactNode }) {
  return (
    <Heading
      as="h1"
      className="m-0 mb-2 font-serif text-[28px] font-bold leading-tight text-[#0F172A]"
    >
      {children}
    </Heading>
  );
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <Text className="m-0 mb-2 text-[11px] font-bold uppercase tracking-[0.3em] text-[#BE185D]">
      {children}
    </Text>
  );
}

export function Paragraph({ children }: { children: React.ReactNode }) {
  return (
    <Text className="m-0 mb-4 text-[15px] leading-[1.6] text-[#27272A]">
      {children}
    </Text>
  );
}

export function Divider() {
  return <hr className="my-6 border-0 border-t border-[#E4E4E7]" />;
}
