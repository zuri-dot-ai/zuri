import { BaseEmailLayout, EmailHeading, EmailBody, EmailButton } from "./BaseEmailLayout";

export interface TrialExpiredEmailProps {
  firstName: string;
  upgradeUrl: string;
  planName?: string;
  lossSummary?: string;
}

export function TrialExpiredEmail({
  firstName,
  upgradeUrl,
  planName = "trial",
  lossSummary,
}: TrialExpiredEmailProps) {
  const loss =
    lossSummary ??
    "publishing your website, content calendar, AI images, and agency marketplace";

  return (
    <BaseEmailLayout preview="Your Zuri trial has ended">
      <EmailHeading>Your trial has ended.</EmailHeading>
      <EmailBody>
        {`Hi ${firstName}, your ${planName} trial is over and your account is now on the Free plan. Nothing was charged.`}
      </EmailBody>
      <EmailBody>
        {`You no longer have access to: ${loss}.`}
      </EmailBody>
      <EmailBody>
        Upgrade anytime to restore full access — no trial restart needed if you are ready to subscribe.
      </EmailBody>
      <EmailButton href={upgradeUrl}>Choose a plan</EmailButton>
    </BaseEmailLayout>
  );
}

export default TrialExpiredEmail;
