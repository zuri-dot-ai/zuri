import { BaseEmailLayout, EmailHeading, EmailBody } from "./BaseEmailLayout";

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
      <EmailHeading>Thanks, {firstName || "there"}.</EmailHeading>
      <EmailBody>
        {`We received your custom build request for a ${projectTypeLabel}. Our team will review it and follow up by email.`}
      </EmailBody>
      <EmailBody>
        {`You can check the status anytime from your Zuri dashboard.`}
      </EmailBody>
    </BaseEmailLayout>
  );
}

export default CustomSiteRequestConfirmationEmail;
