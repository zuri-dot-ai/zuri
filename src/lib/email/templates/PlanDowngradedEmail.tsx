// src/lib/email/templates/PlanDowngradedEmail.tsx

import {
  BaseEmailLayout,
  EmailEyebrow,
  EmailHeading,
  EmailBody,
  EmailButton,
} from "./BaseEmailLayout";

export interface PlanDowngradedEmailProps {
  firstName: string;
  billingUrl: string;
}

export function PlanDowngradedEmail({ firstName, billingUrl }: PlanDowngradedEmailProps) {
  return (
    <BaseEmailLayout preview="Your Zuri plan has been updated to Free">
      <EmailEyebrow>Plan Changed</EmailEyebrow>
      <EmailHeading>{`Your account is now on Free, ${firstName}.`}</EmailHeading>
      <EmailBody>
        {`Your grace period ended without a successful payment, so your account has moved to the Free plan. Your account and data are safe — nothing has been deleted.`}
      </EmailBody>
      <EmailBody>
        {`Resubscribe any time to pick up exactly where you left off.`}
      </EmailBody>
      <EmailButton href={billingUrl}>Resubscribe</EmailButton>
    </BaseEmailLayout>
  );
}

export default PlanDowngradedEmail;
