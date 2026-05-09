import "server-only";

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";

/* ------------------------------------------------------------------ */
/*  Brand colors                                                       */
/* ------------------------------------------------------------------ */

const BRAND_PINK = "#EC4899";
const BRAND_PINK_DARK = "#BE185D";
const BRAND_MAGENTA = "#831843";
const TEXT_DARK = "#0F172A";
const TEXT_MUTED = "#64748B";
const PAGE_BG = "#FFFFFF";

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  page: {
    backgroundColor: PAGE_BG,
    padding: 0,
    fontFamily: "Helvetica",
    color: TEXT_DARK,
    position: "relative",
  },
  outerBorder: {
    position: "absolute",
    top: 24,
    left: 24,
    right: 24,
    bottom: 24,
    borderWidth: 2,
    borderColor: BRAND_PINK,
    borderStyle: "solid",
    borderRadius: 4,
  },
  innerBorder: {
    position: "absolute",
    top: 36,
    left: 36,
    right: 36,
    bottom: 36,
    borderWidth: 0.5,
    borderColor: BRAND_PINK_DARK,
    borderStyle: "solid",
  },
  topAccent: {
    position: "absolute",
    top: 24,
    left: 24,
    right: 24,
    height: 14,
    backgroundColor: BRAND_PINK,
  },
  bottomAccent: {
    position: "absolute",
    bottom: 24,
    left: 24,
    right: 24,
    height: 14,
    backgroundColor: BRAND_PINK,
  },
  body: {
    flex: 1,
    paddingHorizontal: 90,
    paddingTop: 80,
    paddingBottom: 60,
    alignItems: "center",
    justifyContent: "space-between",
  },
  brandBlock: {
    alignItems: "center",
    marginBottom: 6,
  },
  brandPrimary: {
    fontFamily: "Times-Bold",
    fontSize: 26,
    letterSpacing: 1,
    color: TEXT_DARK,
  },
  brandSecondary: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 8,
    color: BRAND_PINK_DARK,
    marginTop: 4,
  },
  divider: {
    width: 60,
    height: 2,
    backgroundColor: BRAND_PINK,
    marginTop: 12,
    marginBottom: 18,
  },
  titleEyebrow: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 6,
    color: BRAND_PINK_DARK,
    textTransform: "uppercase",
  },
  title: {
    fontFamily: "Times-Bold",
    fontSize: 38,
    color: TEXT_DARK,
    marginTop: 4,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 12,
    fontFamily: "Times-Italic",
    color: TEXT_MUTED,
    marginTop: 14,
    textAlign: "center",
  },
  studentName: {
    fontFamily: "Times-BoldItalic",
    fontSize: 36,
    color: BRAND_MAGENTA,
    marginTop: 14,
    marginBottom: 6,
    textAlign: "center",
  },
  studentNameUnderline: {
    width: 320,
    height: 1,
    backgroundColor: TEXT_MUTED,
    marginBottom: 18,
  },
  description: {
    fontSize: 11,
    color: TEXT_DARK,
    lineHeight: 1.6,
    textAlign: "center",
    marginHorizontal: 40,
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
    marginTop: 14,
  },
  scoreLabel: {
    fontSize: 10,
    color: TEXT_MUTED,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  scoreValue: {
    fontFamily: "Times-Bold",
    fontSize: 28,
    color: BRAND_PINK_DARK,
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    width: "100%",
    paddingTop: 30,
  },
  signatureBlock: {
    alignItems: "center",
    flex: 1,
  },
  signatureLine: {
    width: 160,
    borderTopWidth: 0.8,
    borderTopColor: TEXT_DARK,
    borderTopStyle: "solid",
    marginBottom: 4,
  },
  signatureLabel: {
    fontSize: 9,
    color: TEXT_MUTED,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  signatureValue: {
    fontSize: 11,
    fontFamily: "Times-Italic",
    color: TEXT_DARK,
    marginTop: 2,
  },
  serial: {
    position: "absolute",
    bottom: 50,
    left: 0,
    right: 0,
    textAlign: "center",
    fontSize: 7,
    color: TEXT_MUTED,
    letterSpacing: 1,
    fontFamily: "Helvetica",
  },
});

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export type CertificateProps = {
  studentName: string;
  score: number;
  /** ISO date string */
  finishedAt: string;
  /** Attempt ID (used as serial number for verification) */
  attemptId: string;
};

const formatLongDate = (iso: string): string => {
  const d = new Date(iso);
  return d.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

export function CertificateDocument({
  studentName,
  score,
  finishedAt,
  attemptId,
}: CertificateProps) {
  const date = formatLongDate(finishedAt);
  const shortId = attemptId.slice(0, 8).toUpperCase();

  return (
    <Document
      title={`Certificado - ${studentName}`}
      author="Secret Ads Academy"
      subject="Certificado de Certificación"
      creator="Secret Ads Academy"
      producer="Secret Ads Academy"
    >
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.outerBorder} />
        <View style={styles.innerBorder} />
        <View style={styles.topAccent} />
        <View style={styles.bottomAccent} />

        <View style={styles.body}>
          {/* Brand */}
          <View style={styles.brandBlock}>
            <Text style={styles.brandPrimary}>Secret Ads</Text>
            <Text style={styles.brandSecondary}>A C A D E M Y</Text>
            <View style={styles.divider} />
          </View>

          {/* Title */}
          <View style={{ alignItems: "center" }}>
            <Text style={styles.titleEyebrow}>Certificado de</Text>
            <Text style={styles.title}>CERTIFICACIÓN</Text>
            <Text style={styles.subtitle}>Se otorga el presente certificado a</Text>
          </View>

          {/* Student name */}
          <View style={{ alignItems: "center" }}>
            <Text style={styles.studentName}>{studentName}</Text>
            <View style={styles.studentNameUnderline} />
          </View>

          {/* Description */}
          <Text style={styles.description}>
            Por haber completado y aprobado satisfactoriamente el examen de
            certificación oficial de Secret Ads Academy, demostrando el
            conocimiento y las competencias necesarias en marketing de
            performance y publicidad digital.
          </Text>

          {/* Score */}
          <View style={styles.scoreRow}>
            <Text style={styles.scoreLabel}>Calificación obtenida</Text>
            <Text style={styles.scoreValue}>{score.toFixed(0)}%</Text>
          </View>

          {/* Bottom row */}
          <View style={styles.bottomRow}>
            <View style={styles.signatureBlock}>
              <View style={styles.signatureLine} />
              <Text style={styles.signatureLabel}>Fecha de emisión</Text>
              <Text style={styles.signatureValue}>{date}</Text>
            </View>
            <View style={styles.signatureBlock}>
              <View style={styles.signatureLine} />
              <Text style={styles.signatureLabel}>Secret Ads Academy</Text>
              <Text style={styles.signatureValue}>Equipo de certificación</Text>
            </View>
          </View>
        </View>

        <Text style={styles.serial}>
          Nº de certificado: SAA-{shortId} · Verificación disponible bajo
          petición
        </Text>
      </Page>
    </Document>
  );
}
