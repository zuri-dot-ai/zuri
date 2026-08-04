// src/lib/email/templates/GracePeriodEndingEmail.tsx

import {
  BaseEmailLayout,
  EmailEyebrow,
  EmailHeading,
  EmailBody,
  EmailButton,
} from "./BaseEmailLayout";

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
  const hoursLabel = hoursLeft === 1 ? "1 hour" : `${hoursLeft} hours`;

  return (
    <BaseEmailLayout preview={`Your Zuri grace period ends in ${hoursLeft} hours`}>
      <EmailEyebrow>Action Needed</EmailEyebrow>
      <EmailHeading>{`${hoursLabel} left, ${firstName}.`}</EmailHeading>
      <EmailBody>
        {`Your grace period is nearly over. Update your payment method now to keep your website and account running without interruption — it takes less than a minute.`}
      </EmailBody>
      <EmailButton href={updatePaymentUrl}>Update payment method</EmailButton>
    </BaseEmailLayout>
  );
}

export default GracePeriodEndingEmail;
