// src/lib/email/templates/UsageLimitReachedEmail.tsx

import {
  BaseEmailLayout,
  EmailEyebrow,
  EmailHeading,
  EmailBody,
  EmailButton,
  EmailDivider,
} from "./BaseEmailLayout";

export interface UsageLimitReachedEmailProps {
  firstName: string;
  metric: string;
  limit: number;
  resetDate: string;
  upgradeUrl: string;
  currentPlan: string;
  upgradePlan: string;
}

export function UsageLimitReachedEmail({
  firstName,
  metric,
  limit,
  resetDate,
  upgradeUrl,
  currentPlan,
  upgradePlan,
}: UsageLimitReachedEmailProps) {
  return (
    <BaseEmailLayout preview={`You've used all your ${metric} for this month`}>
      <EmailEyebrow>Limit Reached</EmailEyebrow>
      <EmailHeading>{`You've used all ${limit} ${metric}, ${firstName}.`}</EmailHeading>
      <EmailBody>
        {`That's your full ${currentPlan} allowance for the month. Your ${metric} automatically resets on ${resetDate} — or upgrade to ${upgradePlan} now for more, without waiting.`}
      </EmailBody>
      <EmailButton href={upgradeUrl}>Upgrade to {upgradePlan}</EmailButton>
      <EmailDivider />
      <EmailBody style={{ fontSize: "13px", margin: 0 }}>
        {`Prefer to wait? Nothing to do — your allowance resets automatically on ${resetDate}.`}
      </EmailBody>
    </BaseEmailLayout>
  );
}

export default UsageLimitReachedEmail;
