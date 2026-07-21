import { BaseEmailLayout, EmailHeading, EmailBody, EmailButton, EmailDivider } from "./BaseEmailLayout";

export interface PaymentFailedEmailProps {
  firstName: string;
  planName: string;
  gracePeriodEnd: string;
  updatePaymentUrl: string;
}

export function PaymentFailedEmail({
  firstName,
  planName,
  gracePeriodEnd,
  updatePaymentUrl,
}: PaymentFailedEmailProps) {
  return (
    <BaseEmailLayout preview="Action required: your Zuri payment failed">
      <EmailHeading>We couldn&apos;t process your payment.</EmailHeading>
      <EmailBody>
        {`Hi ${firstName}, we attempted to charge your card for your ${planName} plan but the payment did not go through.`}
      </EmailBody>
      <EmailBody>
        {`Your account is in a grace period until ${gracePeriodEnd}. Update your payment method before then to avoid losing access to your features.`}
      </EmailBody>
      <EmailButton href={updatePaymentUrl}>Update payment method</EmailButton>
      <EmailDivider />
      <EmailBody>{`If you have any questions, reply to this email and our team will help.`}</EmailBody>
    </BaseEmailLayout>
  );
}

export default PaymentFailedEmail;
