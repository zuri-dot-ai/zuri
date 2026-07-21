// TODO: copywriting — stub only, doc §2.6
import { BaseEmailLayout, EmailHeading, EmailBody, EmailButton } from "./BaseEmailLayout";

export interface SubscriptionCancelledEmailProps {
  firstName: string;
  periodEnd: string;
  resubscribeUrl: string;
}

export function SubscriptionCancelledEmail({
  firstName,
  periodEnd,
  resubscribeUrl,
}: SubscriptionCancelledEmailProps) {
  return (
    <BaseEmailLayout preview="Your Zuri subscription has been cancelled">
      <EmailHeading>Your subscription is cancelled.</EmailHeading>
      <EmailBody>
        {`Hi ${firstName}, your subscription will remain active until ${periodEnd}.`}
      </EmailBody>
      <EmailButton href={resubscribeUrl}>Resubscribe</EmailButton>
    </BaseEmailLayout>
  );
}

export default SubscriptionCancelledEmail;
