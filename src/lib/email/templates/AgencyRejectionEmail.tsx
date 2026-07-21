import { BaseEmailLayout, EmailHeading, EmailBody } from "./BaseEmailLayout";

export interface AgencyRejectionEmailProps {
  contactName: string;
  agencyName: string;
  reason: string | null;
}

export function AgencyRejectionEmail({
  contactName,
  agencyName,
  reason,
}: AgencyRejectionEmailProps) {
  return (
    <BaseEmailLayout preview={`Update on ${agencyName}'s Zuri application`}>
      <EmailHeading>An update on your application.</EmailHeading>
      <EmailBody>
        {`Hi ${contactName}, thanks for applying to list ${agencyName} on Zuri. We're not able to move forward with your listing at this time.`}
      </EmailBody>
      {reason && <EmailBody>{reason}</EmailBody>}
      <EmailBody>{`You're welcome to reapply in the future.`}</EmailBody>
    </BaseEmailLayout>
  );
}

export default AgencyRejectionEmail;
