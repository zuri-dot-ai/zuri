// TODO: copywriting — stub only, doc §2.4
import { BaseEmailLayout, EmailHeading, EmailBody, EmailButton } from "./BaseEmailLayout";

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
      <EmailHeading>{`You're at ${percentUsed}% of your ${metric} limit.`}</EmailHeading>
      <EmailBody>{`Hi ${firstName}, keep an eye on your usage this month.`}</EmailBody>
      <EmailButton href={upgradeUrl}>View my plan</EmailButton>
    </BaseEmailLayout>
  );
}

export default UsageWarningEmail;
