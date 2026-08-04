// src/lib/email/templates/DomainConnectedEmail.tsx

import { Text as EmailText } from "@react-email/components";
import {
  BaseEmailLayout,
  EmailEyebrow,
  EmailHeading,
  EmailBody,
  EmailCard,
  BRAND,
  FONT_BODY,
} from "./BaseEmailLayout";

export interface DomainConnectedEmailProps {
  firstName: string;
  domain: string;
}

export function DomainConnectedEmail({ firstName, domain }: DomainConnectedEmailProps) {
  return (
    <BaseEmailLayout preview={`${domain} is connected to your Zuri website`}>
      <EmailEyebrow>Domain Connected</EmailEyebrow>
      <EmailHeading>{`${domain} is yours now, ${firstName}.`}</EmailHeading>
      <EmailBody>
        {`Your custom domain is fully connected and pointing to your Zuri website — no more shared subdomain, just your own address.`}
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
          Connected domain
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
    </BaseEmailLayout>
  );
}

export default DomainConnectedEmail;
