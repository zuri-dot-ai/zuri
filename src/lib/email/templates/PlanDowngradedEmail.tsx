import { BaseEmailLayout, EmailHeading, EmailBody, EmailButton } from "./BaseEmailLayout";

export interface PlanDowngradedEmailProps {
  firstName: string;
  billingUrl: string;
}

export function PlanDowngradedEmail({ firstName, billingUrl }: PlanDowngradedEmailProps) {
  return (
    <BaseEmailLayout preview="Your Zuri plan has been updated to Free">
      <EmailHeading>Your plan is now Free.</EmailHeading>
      <EmailBody>
        {`Hi ${firstName}, your grace period ended without a successful payment, so your account is now on the Free plan.`}
      </EmailBody>
      <EmailBody>{`You can resubscribe any time to restore full access.`}</EmailBody>
      <EmailButton href={billingUrl}>Resubscribe</EmailButton>
    </BaseEmailLayout>
  );
}

export default PlanDowngradedEmail;
