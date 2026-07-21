import { BaseEmailLayout, EmailHeading, EmailBody, EmailButton, EmailDivider, EmailHighlight } from "./BaseEmailLayout";

export interface PaymentSuccessfulEmailProps {
  firstName: string;
  planName: string;
  billingCycle: "monthly" | "annual";
  nextBillingDate: string;
  dashboardUrl: string;
}

export function PaymentSuccessfulEmail({
  firstName,
  planName,
  billingCycle,
  nextBillingDate,
  dashboardUrl,
}: PaymentSuccessfulEmailProps) {
  return (
    <BaseEmailLayout preview={`Welcome to Zuri ${planName} — you're all set`}>
      <EmailHeading>You&apos;re all set, {firstName}.</EmailHeading>
      <EmailBody>
        {`Your ${planName} plan is now active (${billingCycle} billing).`}
      </EmailBody>
      <EmailDivider />
      <EmailHighlight label="Plan" value={planName} />
      <EmailHighlight label="Next billing date" value={nextBillingDate} />
      <EmailDivider />
      <EmailButton href={dashboardUrl}>Go to my dashboard</EmailButton>
    </BaseEmailLayout>
  );
}

export default PaymentSuccessfulEmail;
