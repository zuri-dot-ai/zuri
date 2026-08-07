// src/lib/email/templates/AgencyInquiryReceivedEmail.tsx

import { Text as EmailText } from "@react-email/components";
import {
  BaseEmailLayout,
  EmailEyebrow,
  EmailHeading,
  EmailBody,
  EmailCard,
  EmailHighlight,
  BRAND,
  FONT_BODY,
} from "./BaseEmailLayout";

export interface AgencyInquiryReceivedEmailProps {
  agencyName: string;
  userBusinessName: string;
  userName: string;
  userEmail: string;
  userIndustry: string | null;
  userLocation: string | null;
  serviceNeeded: string | null;
  message: string;
  budget: string | null;
}

export function AgencyInquiryReceivedEmail({
  agencyName,
  userBusinessName,
  userName,
  userEmail,
  userIndustry,
  userLocation,
  serviceNeeded,
  message,
  budget,
}: AgencyInquiryReceivedEmailProps) {
  return (
    <BaseEmailLayout preview={`New client brief from ${userBusinessName} via Zuri`}>
      <EmailEyebrow>New Enquiry</EmailEyebrow>
      <EmailHeading>{`${agencyName}, you have a new lead.`}</EmailHeading>
      <EmailBody>
        {`A business owner on Zuri would like to work with you. Here's their brief:`}
      </EmailBody>

      <EmailCard>
        <EmailHighlight label="Business" value={userBusinessName} />
        <EmailHighlight label="Contact" value={userName} />
        <EmailHighlight label="Email" value={userEmail} />
        {userIndustry && <EmailHighlight label="Industry" value={userIndustry} />}
        {userLocation && <EmailHighlight label="Location" value={userLocation} />}
        {serviceNeeded && <EmailHighlight label="Service needed" value={serviceNeeded} />}
        {budget && <EmailHighlight label="Budget" value={budget} />}
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
          margin: "0 0 24px",
        }}
      >
        {message}
      </EmailText>

      <EmailBody style={{ fontSize: "13px", margin: 0 }}>
        {`Reply directly to this email to respond to ${userName}.`}
      </EmailBody>
    </BaseEmailLayout>
  );
}

export default AgencyInquiryReceivedEmail;
