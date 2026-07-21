import { BaseEmailLayout, EmailHeading, EmailBody, EmailButton } from "./BaseEmailLayout";

export interface TrialEndingEmailProps {
  firstName: string;
  daysLeft: number;
  upgradeUrl: string;
}

export function TrialEndingEmail({ firstName, daysLeft, upgradeUrl }: TrialEndingEmailProps) {
  return (
    <BaseEmailLayout preview={`Your Zuri trial ends in ${daysLeft} days`}>
      <EmailHeading>{`Your trial ends in ${daysLeft} day${daysLeft === 1 ? "" : "s"}.`}</EmailHeading>
      <EmailBody>
        {`Hi ${firstName}, we hope you've enjoyed building your presence on Zuri. Add a payment method now to keep everything running without interruption.`}
      </EmailBody>
      <EmailButton href={upgradeUrl}>Choose a plan</EmailButton>
    </BaseEmailLayout>
  );
}

export default TrialEndingEmail;
