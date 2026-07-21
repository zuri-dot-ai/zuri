// docs/08_NOTIFICATIONS.md §5.3 — shared layout for all transactional emails.

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
import type { ReactNode } from "react";

interface BaseEmailLayoutProps {
  preview: string;
  children: ReactNode;
}

const BRAND_GOLD = "#C9A84C";
const BRAND_BG = "#0C0C0E";
const BRAND_SURFACE = "#141416";
const BRAND_TEXT = "#F0EDE8";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://app.buildzuri.com";

export function BaseEmailLayout({ preview, children }: BaseEmailLayoutProps) {
  return (
    <Html lang="en" dir="ltr">
      <Head>
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
          backgroundColor: "#F4F4F4",
          margin: 0,
          padding: "40px 0",
          fontFamily: "Montserrat, Arial, sans-serif",
        }}
      >
        <Container style={{ maxWidth: "560px", margin: "0 auto" }}>
          <Section
            style={{
              backgroundColor: BRAND_BG,
              borderRadius: "12px 12px 0 0",
              padding: "24px 32px",
              textAlign: "center",
            }}
          >
            <Img
              src={`${APP_URL}/Zuri_Logo.png`}
              alt="Zuri"
              width={80}
              height={24}
              style={{ objectFit: "contain", margin: "0 auto" }}
            />
          </Section>

          <Section
            style={{
              backgroundColor: BRAND_SURFACE,
              padding: "32px",
              borderLeft: "1px solid #222",
              borderRight: "1px solid #222",
            }}
          >
            {children}
          </Section>

          <Section
            style={{
              backgroundColor: BRAND_BG,
              borderRadius: "0 0 12px 12px",
              padding: "24px 32px",
              borderTop: "1px solid #222",
            }}
          >
            <Text
              style={{
                color: "#666",
                fontSize: "12px",
                textAlign: "center",
                margin: "0 0 8px",
              }}
            >
              Built for Africa. Powered by Gemini.
            </Text>
            <Text
              style={{ color: "#444", fontSize: "11px", textAlign: "center", margin: 0 }}
            >
              <Link href={`${APP_URL}/settings?tab=notifications`} style={{ color: "#666" }}>
                Manage notifications
              </Link>
              {" · "}
              <Link href={`${APP_URL}/privacy`} style={{ color: "#666" }}>
                Privacy
              </Link>
              {" · "}
              <Link href={`${APP_URL}/terms`} style={{ color: "#666" }}>
                Terms
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export function EmailHeading({ children }: { children: ReactNode }) {
  return (
    <Text
      style={{
        color: BRAND_TEXT,
        fontSize: "22px",
        fontWeight: 600,
        margin: "0 0 12px",
        lineHeight: "1.3",
      }}
    >
      {children}
    </Text>
  );
}

export function EmailBody({ children }: { children: ReactNode }) {
  return (
    <Text
      style={{
        color: "#A0A0A0",
        fontSize: "15px",
        lineHeight: "1.6",
        margin: "0 0 20px",
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
    <Section style={{ textAlign: "center", margin: "24px 0" }}>
      <Link
        href={href}
        style={{
          backgroundColor: BRAND_GOLD,
          color: "#0C0C0E",
          padding: "14px 32px",
          borderRadius: "8px",
          fontWeight: 600,
          fontSize: "14px",
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
  return <Hr style={{ borderColor: "#222", margin: "24px 0" }} />;
}

export function EmailHighlight({ label, value }: { label: string; value: string }) {
  return (
    <Row style={{ marginBottom: "8px" }}>
      <Column style={{ color: "#666", fontSize: "13px", width: "40%" }}>{label}</Column>
      <Column style={{ color: BRAND_TEXT, fontSize: "13px", fontWeight: 500 }}>
        {value}
      </Column>
    </Row>
  );
}
