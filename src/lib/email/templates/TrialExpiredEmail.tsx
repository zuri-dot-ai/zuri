// TODO: copywriting — stub only, doc §2.6
import { BaseEmailLayout, EmailHeading, EmailBody, EmailButton } from "./BaseEmailLayout";

export interface TrialExpiredEmailProps {
  firstName: string;
  upgradeUrl: string;
}

export function TrialExpiredEmail({ firstName, upgradeUrl }: TrialExpiredEmailProps) {
  return (
    <BaseEmailLayout preview="Your Zuri trial has expired">
      <EmailHeading>Your trial has ended.</EmailHeading>
      <EmailBody>{`Hi ${firstName}, choose a plan to keep your website and content live.`}</EmailBody>
      <EmailButton href={upgradeUrl}>Choose a plan</EmailButton>
    </BaseEmailLayout>
  );
}

export default TrialExpiredEmail;
