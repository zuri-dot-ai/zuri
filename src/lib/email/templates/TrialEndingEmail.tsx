import { BaseEmailLayout, EmailHeading, EmailBody, EmailButton } from "./BaseEmailLayout";

export interface TrialEndingEmailProps {
  firstName: string;
  daysLeft: number;
  upgradeUrl: string;
  planName?: string;
  lossSummary?: string;
}

export function TrialEndingEmail({
  firstName,
  daysLeft,
  upgradeUrl,
  planName = "your",
  lossSummary,
}: TrialEndingEmailProps) {
  const dayLabel = daysLeft === 1 ? "1 day" : `${daysLeft} days`;
  const loss =
    lossSummary ??
    "publishing your website, content calendar, AI images, and agency marketplace";

  return (
    <BaseEmailLayout preview={`Your Zuri trial ends in ${dayLabel}`}>
      <EmailHeading>{`Your ${planName} trial ends in ${dayLabel}.`}</EmailHeading>
      <EmailBody>
        {`Hi ${firstName}, nothing will be charged — there is no card on file. When the trial ends, your account automatically moves to Free.`}
      </EmailBody>
      <EmailBody>
        {`On Free you will lose access to: ${loss}.`}
      </EmailBody>
      <EmailBody>
        Upgrade now to keep everything running without interruption.
      </EmailBody>
      <EmailButton href={upgradeUrl}>Upgrade your plan</EmailButton>
    </BaseEmailLayout>
  );
}

export default TrialEndingEmail;
