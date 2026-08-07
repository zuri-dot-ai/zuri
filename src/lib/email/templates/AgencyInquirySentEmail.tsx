// src/lib/email/templates/AgencyInquirySentEmail.tsx

import {
  BaseEmailLayout,
  EmailEyebrow,
  EmailHeading,
  EmailBody,
} from "./BaseEmailLayout";

export interface AgencyInquirySentEmailProps {
  userName: string | null;
  agencyName: string;
  responseTime: string;
}

export function AgencyInquirySentEmail({
  userName,
  agencyName,
  responseTime,
}: AgencyInquirySentEmailProps) {
  const greeting = userName ? `${userName}, ` : "";
  return (
    <BaseEmailLayout preview={`Your inquiry to ${agencyName} has been sent`}>
      <EmailEyebrow>Inquiry Sent</EmailEyebrow>
      <EmailHeading>{`${greeting}${agencyName} has your message.`}</EmailHeading>
      <EmailBody>
        {`We've forwarded your enquiry directly to ${agencyName}. They ${responseTime.toLowerCase()}.`}
      </EmailBody>
      <EmailBody style={{ fontSize: "13px", margin: 0 }}>
        {`Your email address was shared with ${agencyName} so they can reply to you directly.`}
      </EmailBody>
    </BaseEmailLayout>
  );
}

export default AgencyInquirySentEmail;
