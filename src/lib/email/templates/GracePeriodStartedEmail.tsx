// TODO: copywriting — stub only, doc §2.6
import { BaseEmailLayout, EmailHeading, EmailBody, EmailButton } from "./BaseEmailLayout";

export interface GracePeriodStartedEmailProps {
  firstName: string;
  gracePeriodEnd: string;
  updatePaymentUrl: string;
}

export function GracePeriodStartedEmail({
  firstName,
  gracePeriodEnd,
  updatePaymentUrl,
}: GracePeriodStartedEmailProps) {
  return (
    <BaseEmailLayout preview="Your Zuri grace period has started">
      <EmailHeading>Your grace period has started.</EmailHeading>
      <EmailBody>
        {`Hi ${firstName}, you have until ${gracePeriodEnd} to update your payment method.`}
      </EmailBody>
      <EmailButton href={updatePaymentUrl}>Update payment method</EmailButton>
    </BaseEmailLayout>
  );
}

export default GracePeriodStartedEmail;
