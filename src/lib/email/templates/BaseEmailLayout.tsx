// src/lib/email/templates/BaseEmailLayout.tsx
// Shared layout for all Zuri transactional emails — chrome/gold design system.

import {
  Body,
  Container,
  Head,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Column,
  Section,
  Text,
  Hr,
  Font,
} from "@react-email/components";
import type { ReactNode, CSSProperties } from "react";

interface BaseEmailLayoutProps {
  preview: string;
  children: ReactNode;
}

// ── Brand tokens (mirrors src/lib/constants.ts BRAND.colors / src/styles/tokens.ts) ──
export const BRAND = {
  gold: "#C9A84C",
  goldBright: "#D4B55F",
  goldMuted: "rgba(201, 168, 76, 0.18)",
  bg: "#0D0C0A",
  surface: "#161411",
  elevated: "#1C1915",
  border: "rgba(201, 162, 39, 0.16)",
  textPrimary: "#F5F5F4",
  textSecondary: "#A1A1AA",
  textTertiary: "#6B6B70",
  success: "#3D9970",
  error: "#C0392B",
  canvas: "#F4F4F4",
};

// Email-safe font stacks. Cormorant Garamond is loaded as a webfont for
// clients that support it; the fallback chain is a genuine serif chain
// (not sans) so clients that drop the webfont still read as "editorial",
// not generic-SaaS.
export const FONT_HEADING =
  "'Cormorant Garamond', 'Times New Roman', Georgia, 'Playfair Display', serif";
export const FONT_BODY =
  "Montserrat, 'Helvetica Neue', Arial, sans-serif";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://app.buildzuri.com";

export function BaseEmailLayout({ preview, children }: BaseEmailLayoutProps) {
  return (
    <Html lang="en" dir="ltr">
      <Head>
        <Font
          fontFamily="Cormorant Garamond"
          fallbackFontFamily="Georgia"
          webFont={{
            url: "https://fonts.gstatic.com/s/cormorantgaramond/v16/co3bmX5slCNuHLi8bLeY9MK7whWMhyjYrEtn.woff2",
            format: "woff2",
          }}
          fontWeight={600}
          fontStyle="normal"
        />
        <Font
          fontFamily="Montserrat"
          fallbackFontFamily="Arial"
          webFont={{
            url: "https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459Wlhyw.woff2",
            format: "woff2",
          }}
          fontWeight={400}
          fontStyle="normal"
        />
      </Head>
      <Preview>{preview}</Preview>
      <Body
        style={{
          backgroundColor: BRAND.canvas,
          margin: 0,
          padding: "40px 0",
          fontFamily: FONT_BODY,
        }}
      >
        <Container style={{ maxWidth: "560px", margin: "0 auto" }}>
          {/* Header — full logo lockup on black, hairline gold rule beneath */}
          <Section
            style={{
              backgroundColor: BRAND.bg,
              borderRadius: "12px 12px 0 0",
              padding: "36px 32px 28px",
              textAlign: "center",
            }}
          >
            <Img
              src={`${APP_URL}/Zuri_Logo.png`}
              alt="Zuri"
              width={168}
              height={84}
              style={{ objectFit: "contain", margin: "0 auto", display: "block" }}
            />
          </Section>

          {/* Gold hairline separating header from body — the one recurring
              "chrome edge" motif that ties every email together */}
          <Section style={{ backgroundColor: BRAND.bg, padding: "0 32px" }}>
            <Hr
              style={{
                border: 0,
                borderTop: `1px solid ${BRAND.gold}`,
                opacity: 0.5,
                margin: 0,
              }}
            />
          </Section>

          <Section
            style={{
              backgroundColor: BRAND.surface,
              padding: "40px 36px",
              borderLeft: `1px solid ${BRAND.border}`,
              borderRight: `1px solid ${BRAND.border}`,
            }}
          >
            {children}
          </Section>

          <Section
            style={{
              backgroundColor: BRAND.bg,
              borderRadius: "0 0 12px 12px",
              padding: "28px 32px",
              borderTop: `1px solid ${BRAND.border}`,
            }}
          >
            <Text
              style={{
                color: BRAND.gold,
                fontFamily: FONT_HEADING,
                fontStyle: "italic",
                fontSize: "14px",
                textAlign: "center",
                margin: "0 0 10px",
                letterSpacing: "0.02em",
              }}
            >
              Built for Africa. Powered by Gemini.
            </Text>
            <Text
              style={{ color: "#555", fontSize: "11px", textAlign: "center", margin: 0 }}
            >
              <Link href={`${APP_URL}/settings?tab=notifications`} style={{ color: "#777" }}>
                Manage notifications
              </Link>
              {" · "}
              <Link href={`${APP_URL}/privacy.html`} style={{ color: "#777" }}>
                Privacy
              </Link>
              {" · "}
              <Link href={`${APP_URL}/terms`} style={{ color: "#777" }}>
                Terms
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// ── Reusable primitives ──────────────────────────────────────────────

/** Small gold uppercase kicker — use above a heading for a named "moment"
 *  (e.g. "WEBSITE LIVE", "PAYMENT CONFIRMED"). Optional. */
export function EmailEyebrow({ children }: { children: ReactNode }) {
  return (
    <Text
      style={{
        color: BRAND.gold,
        fontFamily: FONT_BODY,
        fontSize: "11px",
        fontWeight: 600,
        letterSpacing: "0.16em",
        textTransform: "uppercase",
        margin: "0 0 10px",
      }}
    >
      {children}
    </Text>
  );
}

export function EmailHeading({ children }: { children: ReactNode }) {
  return (
    <Text
      style={{
        color: BRAND.textPrimary,
        fontFamily: FONT_HEADING,
        fontSize: "30px",
        fontWeight: 600,
        margin: "0 0 18px",
        lineHeight: "1.25",
        letterSpacing: "0.01em",
      }}
    >
      {children}
    </Text>
  );
}

export function EmailBody({
  children,
  style,
}: {
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <Text
      style={{
        color: BRAND.textSecondary,
        fontFamily: FONT_BODY,
        fontSize: "15px",
        lineHeight: "1.65",
        margin: "0 0 20px",
        ...style,
      }}
    >
      {children}
    </Text>
  );
}

export function EmailButton({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Section style={{ textAlign: "center", margin: "28px 0 8px" }}>
      <Link
        href={href}
        style={{
          backgroundColor: BRAND.gold,
          color: BRAND.bg,
          padding: "15px 36px",
          borderRadius: "6px",
          fontFamily: FONT_BODY,
          fontWeight: 600,
          fontSize: "13px",
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          textDecoration: "none",
          display: "inline-block",
        }}
      >
        {children}
      </Link>
    </Section>
  );
}

export function EmailDivider() {
  return <Hr style={{ borderColor: BRAND.border, margin: "28px 0" }} />;
}

export function EmailHighlight({ label, value }: { label: string; value: string }) {
  return (
    <Row style={{ marginBottom: "10px" }}>
      <Column style={{ color: BRAND.textTertiary, fontSize: "13px", width: "42%" }}>
        {label}
      </Column>
      <Column
        style={{
          color: BRAND.textPrimary,
          fontSize: "13px",
          fontWeight: 500,
          fontFamily: FONT_BODY,
        }}
      >
        {value}
      </Column>
    </Row>
  );
}

/** Large numeric callout — for stats, prices, counts. Uses the heading
 *  serif at display size for a more "editorial report" feel than a
 *  generic dashboard number. */
export function EmailStat({ value, caption }: { value: string; caption: string }) {
  return (
    <>
      <Text
        style={{
          color: BRAND.gold,
          fontFamily: FONT_HEADING,
          fontSize: "44px",
          fontWeight: 600,
          margin: "0 0 2px",
          lineHeight: 1,
        }}
      >
        {value}
      </Text>
      <Text
        style={{
          color: BRAND.textTertiary,
          fontFamily: FONT_BODY,
          fontSize: "12px",
          margin: 0,
        }}
      >
        {caption}
      </Text>
    </>
  );
}

/** Bordered card — wraps a block in a subtle gold-edged panel. Useful for
 *  "receipt" style content (payment confirmations, plan summaries) so it
 *  reads as a distinct object inside the email rather than more body text. */
export function EmailCard({ children }: { children: ReactNode }) {
  return (
    <Section
      style={{
        backgroundColor: BRAND.elevated,
        border: `1px solid ${BRAND.border}`,
        borderRadius: "8px",
        padding: "20px 22px",
        margin: "8px 0 24px",
      }}
    >
      {children}
    </Section>
  );
}
