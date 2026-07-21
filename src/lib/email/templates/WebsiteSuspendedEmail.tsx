// TODO: copywriting — stub only, doc §2.3
import { BaseEmailLayout, EmailHeading, EmailBody, EmailButton } from "./BaseEmailLayout";

export interface WebsiteSuspendedEmailProps {
  firstName: string;
  billingUrl: string;
}

export function WebsiteSuspendedEmail({ firstName, billingUrl }: WebsiteSuspendedEmailProps) {
  return (
    <BaseEmailLayout preview="Your website has been suspended">
      <EmailHeading>Your website is temporarily unavailable.</EmailHeading>
      <EmailBody>
        {`Hi ${firstName}, your website has been suspended because your plan is no longer active.`}
      </EmailBody>
      <EmailButton href={billingUrl}>Renew my plan</EmailButton>
    </BaseEmailLayout>
  );
}

export default WebsiteSuspendedEmail;
