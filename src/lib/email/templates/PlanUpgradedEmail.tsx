// src/lib/email/templates/PlanUpgradedEmail.tsx

import {
  BaseEmailLayout,
  EmailEyebrow,
  EmailHeading,
  EmailBody,
  EmailButton,
} from "./BaseEmailLayout";

export interface PlanUpgradedEmailProps {
  firstName: string;
  planName: string;
  dashboardUrl: string;
}

export function PlanUpgradedEmail({ firstName, planName, dashboardUrl }: PlanUpgradedEmailProps) {
  return (
    <BaseEmailLayout preview={`You're now on Zuri ${planName}`}>
      <EmailEyebrow>Plan Upgraded</EmailEyebrow>
      <EmailHeading>{`Welcome to ${planName}, ${firstName}.`}</EmailHeading>
      <EmailBody>
        {`Your upgrade is live right now — no waiting, nothing else to configure. Everything that comes with ${planName} is already available in your dashboard.`}
      </EmailBody>
      <EmailButton href={dashboardUrl}>Explore what's new</EmailButton>
    </BaseEmailLayout>
  );
}

export default PlanUpgradedEmail;
