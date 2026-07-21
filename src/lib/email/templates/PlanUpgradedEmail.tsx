// TODO: copywriting — stub only, doc §2.6
import { BaseEmailLayout, EmailHeading, EmailBody, EmailButton } from "./BaseEmailLayout";

export interface PlanUpgradedEmailProps {
  firstName: string;
  planName: string;
  dashboardUrl: string;
}

export function PlanUpgradedEmail({ firstName, planName, dashboardUrl }: PlanUpgradedEmailProps) {
  return (
    <BaseEmailLayout preview={`You're now on Zuri ${planName}`}>
      <EmailHeading>{`You're now on ${planName}.`}</EmailHeading>
      <EmailBody>{`Hi ${firstName}, your plan has been upgraded. Enjoy the new features.`}</EmailBody>
      <EmailButton href={dashboardUrl}>Go to my dashboard</EmailButton>
    </BaseEmailLayout>
  );
}

export default PlanUpgradedEmail;
