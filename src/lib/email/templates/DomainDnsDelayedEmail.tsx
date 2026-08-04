// src/lib/email/templates/DomainDnsDelayedEmail.tsx

import { Text as EmailText } from "@react-email/components";
import {
  BaseEmailLayout,
  EmailEyebrow,
  EmailHeading,
  EmailBody,
  EmailButton,
  EmailCard,
  BRAND,
  FONT_BODY,
} from "./BaseEmailLayout";

export interface DomainDnsDelayedEmailProps {
  firstName: string;
  domain: string;
  setupGuideUrl: string;
}

export function DomainDnsDelayedEmail({
  firstName,
  domain,
  setupGuideUrl,
}: DomainDnsDelayedEmailProps) {
  return (
    <BaseEmailLayout preview={`${domain} DNS still hasn't propagated`}>
      <EmailEyebrow>Domain Setup</EmailEyebrow>
      <EmailHeading>{`${domain} still isn't connected, ${firstName}.`}</EmailHeading>
      <EmailBody>
        {`It's been over 48 hours since you added this domain and it still hasn't started pointing to your Zuri website. This is usually a small DNS record issue, not a problem on our end.`}
      </EmailBody>

      <EmailCard>
        <EmailText
          style={{
            color: BRAND.textTertiary,
            fontFamily: FONT_BODY,
            fontSize: "11px",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            margin: "0 0 6px",
          }}
        >
          Waiting on
        </EmailText>
        <EmailText
          style={{
            color: BRAND.gold,
            fontFamily: FONT_BODY,
            fontSize: "16px",
            fontWeight: 600,
            margin: 0,
          }}
        >
          {domain}
        </EmailText>
      </EmailCard>

      <EmailButton href={setupGuideUrl}>View setup guide</EmailButton>
    </BaseEmailLayout>
  );
}

export default DomainDnsDelayedEmail;
