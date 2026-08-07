// src/lib/email/templates/ContactFormReceivedEmail.tsx

import { Text as EmailText } from "@react-email/components";
import {
  BaseEmailLayout,
  EmailEyebrow,
  EmailHeading,
  EmailBody,
  EmailButton,
  EmailCard,
  EmailHighlight,
  BRAND,
  FONT_BODY,
} from "./BaseEmailLayout";

export interface ContactFormReceivedEmailProps {
  ownerName: string;
  ownerBusinessName: string;
  senderName: string;
  senderEmail: string;
  message: string;
  serviceInterest: string | null;
}

export function ContactFormReceivedEmail({
  ownerName,
  ownerBusinessName,
  senderName,
  senderEmail,
  message,
  serviceInterest,
}: ContactFormReceivedEmailProps) {
  return (
    <BaseEmailLayout preview={`New enquiry for ${ownerBusinessName} from ${senderName}`}>
      <EmailEyebrow>New Enquiry</EmailEyebrow>
      <EmailHeading>{`Someone's reaching out, ${ownerName}.`}</EmailHeading>
      <EmailBody>
        {`A visitor to your ${ownerBusinessName} website just got in touch. Here's what they sent:`}
      </EmailBody>

      <EmailCard>
        <EmailHighlight label="From" value={senderName} />
        <EmailHighlight label="Email" value={senderEmail} />
        {serviceInterest && (
          <EmailHighlight label="Service interest" value={serviceInterest} />
        )}
      </EmailCard>

      <EmailText
        style={{
          color: BRAND.textTertiary,
          fontFamily: FONT_BODY,
          fontSize: "11px",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          margin: "0 0 8px",
        }}
      >
        Message
      </EmailText>
      <EmailText
        style={{
          color: BRAND.textPrimary,
          fontFamily: FONT_BODY,
          fontSize: "14px",
          lineHeight: "1.65",
          backgroundColor: BRAND.elevated,
          border: `1px solid ${BRAND.border}`,
          padding: "18px 20px",
          borderRadius: "8px",
          margin: "0 0 28px",
        }}
      >
        {message}
      </EmailText>

      <EmailButton href={`mailto:${senderEmail}`}>{`Reply to ${senderName}`}</EmailButton>
      <EmailBody style={{ fontSize: "13px", margin: "16px 0 0" }}>
        {`Every enquiry is also saved to your Zuri dashboard, so nothing gets lost.`}
      </EmailBody>
    </BaseEmailLayout>
  );
}

export default ContactFormReceivedEmail;
