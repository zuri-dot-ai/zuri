// src/lib/email/templates/AgencyApplicationConfirmationEmail.tsx

import {
  BaseEmailLayout,
  EmailEyebrow,
  EmailHeading,
  EmailBody,
} from "./BaseEmailLayout";

export interface AgencyApplicationConfirmationEmailProps {
  contactName: string;
  agencyName: string;
}

export function AgencyApplicationConfirmationEmail({
  contactName,
  agencyName,
}: AgencyApplicationConfirmationEmailProps) {
  return (
    <BaseEmailLayout preview={`We received ${agencyName}'s application to join Zuri`}>
      <EmailEyebrow>Application Received</EmailEyebrow>
      <EmailHeading>{`Thanks for applying, ${contactName}.`}</EmailHeading>
      <EmailBody>
        {`We've received ${agencyName}'s application to join the Zuri agency marketplace, where businesses across Africa come looking for partners like you.`}
      </EmailBody>
      <EmailBody style={{ fontSize: "13px", margin: 0 }}>
        {`We review every application within 7 business days and will follow up by email either way.`}
      </EmailBody>
    </BaseEmailLayout>
  );
}

export default AgencyApplicationConfirmationEmail;
