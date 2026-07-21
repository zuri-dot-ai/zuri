import { BaseEmailLayout, EmailHeading, EmailBody, EmailButton } from "./BaseEmailLayout";

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
      <EmailHeading>{`You've reached your ${metric} limit.`}</EmailHeading>
      <EmailBody>
        {`Hi ${firstName}, you've used all ${limit} ${metric} on your ${currentPlan} plan this month. Your allowance resets on ${resetDate}.`}
      </EmailBody>
      <EmailBody>
        {`Upgrade to ${upgradePlan} to get more ${metric} immediately — without waiting for the reset.`}
      </EmailBody>
      <EmailButton href={upgradeUrl}>Upgrade my plan</EmailButton>
      <EmailBody>{`Or wait until ${resetDate} and your allowance will automatically reset.`}</EmailBody>
    </BaseEmailLayout>
  );
}

export default UsageLimitReachedEmail;
