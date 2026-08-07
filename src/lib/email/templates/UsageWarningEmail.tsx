// src/lib/email/templates/UsageWarningEmail.tsx

import {
  BaseEmailLayout,
  EmailEyebrow,
  EmailHeading,
  EmailBody,
  EmailButton,
  EmailStat,
} from "./BaseEmailLayout";

export interface UsageWarningEmailProps {
  firstName: string;
  metric: string;
  percentUsed: number;
  upgradeUrl: string;
}

export function UsageWarningEmail({
  firstName,
  metric,
  percentUsed,
  upgradeUrl,
}: UsageWarningEmailProps) {
  return (
    <BaseEmailLayout preview={`You've used ${percentUsed}% of your ${metric}`}>
      <EmailEyebrow>Usage Update</EmailEyebrow>
      <EmailHeading>{`Just a heads-up, ${firstName}.`}</EmailHeading>
      <EmailBody>
        {`You're getting close to your ${metric} allowance for this month. No action needed yet — just wanted you to see it coming.`}
      </EmailBody>
      <EmailStat value={`${percentUsed}%`} caption={`of your ${metric} used this month`} />
      <EmailButton href={upgradeUrl}>View my plan</EmailButton>
    </BaseEmailLayout>
  );
}

export default UsageWarningEmail;
