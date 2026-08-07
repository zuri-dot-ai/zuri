// src/lib/email/templates/CustomSiteRequestConfirmationEmail.tsx

import {
  BaseEmailLayout,
  EmailEyebrow,
  EmailHeading,
  EmailBody,
} from "./BaseEmailLayout";

export interface CustomSiteRequestConfirmationEmailProps {
  firstName: string;
  projectTypeLabel: string;
}

export function CustomSiteRequestConfirmationEmail({
  firstName,
  projectTypeLabel,
}: CustomSiteRequestConfirmationEmailProps) {
  return (
    <BaseEmailLayout preview="We received your custom site request">
      <EmailEyebrow>Request Received</EmailEyebrow>
      <EmailHeading>{`Thanks, ${firstName || "there"}.`}</EmailHeading>
      <EmailBody>
        {`We've received your custom build request for a ${projectTypeLabel}. Our team will review the details and follow up by email with next steps.`}
      </EmailBody>
      <EmailBody style={{ fontSize: "13px", margin: 0 }}>
        {`You can check the status any time from your Zuri dashboard.`}
      </EmailBody>
    </BaseEmailLayout>
  );
}

export default CustomSiteRequestConfirmationEmail;
