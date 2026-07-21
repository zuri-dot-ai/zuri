// TODO: copywriting — stub only, doc §2.6
import { BaseEmailLayout, EmailHeading, EmailBody, EmailButton } from "./BaseEmailLayout";

export interface GracePeriodEndingEmailProps {
  firstName: string;
  hoursLeft: number;
  updatePaymentUrl: string;
}

export function GracePeriodEndingEmail({
  firstName,
  hoursLeft,
  updatePaymentUrl,
}: GracePeriodEndingEmailProps) {
  return (
    <BaseEmailLayout preview={`Your Zuri grace period ends in ${hoursLeft} hours`}>
      <EmailHeading>{`Your grace period ends in ${hoursLeft} hours.`}</EmailHeading>
      <EmailBody>{`Hi ${firstName}, update your payment method now to avoid losing access.`}</EmailBody>
      <EmailButton href={updatePaymentUrl}>Update payment method</EmailButton>
    </BaseEmailLayout>
  );
}

export default GracePeriodEndingEmail;
