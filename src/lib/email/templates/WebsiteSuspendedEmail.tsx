// src/lib/email/templates/WebsiteSuspendedEmail.tsx

import {
  BaseEmailLayout,
  EmailEyebrow,
  EmailHeading,
  EmailBody,
  EmailButton,
} from "./BaseEmailLayout";

export interface WebsiteSuspendedEmailProps {
  firstName: string;
  billingUrl: string;
}

export function WebsiteSuspendedEmail({ firstName, billingUrl }: WebsiteSuspendedEmailProps) {
  return (
    <BaseEmailLayout preview="Your website has been suspended">
      <EmailEyebrow>Website Paused</EmailEyebrow>
      <EmailHeading>{`Your website is offline for now, ${firstName}.`}</EmailHeading>
      <EmailBody>
        {`Your plan is no longer active, so your website has been temporarily taken down — it's not deleted, and nothing has been lost. Renewing your plan brings it straight back online.`}
      </EmailBody>
      <EmailButton href={billingUrl}>Renew my plan</EmailButton>
    </BaseEmailLayout>
  );
}

export default WebsiteSuspendedEmail;
