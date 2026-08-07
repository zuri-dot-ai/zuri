// src/lib/email/templates/AgencyRejectionEmail.tsx

import {
  BaseEmailLayout,
  EmailEyebrow,
  EmailHeading,
  EmailBody,
} from "./BaseEmailLayout";

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
      <EmailEyebrow>Application Update</EmailEyebrow>
      <EmailHeading>{`An update on your application, ${contactName}.`}</EmailHeading>
      <EmailBody>
        {`Thank you for applying to list ${agencyName} on Zuri. After review, we're not able to move forward with your listing at this time.`}
      </EmailBody>
      {reason && <EmailBody>{reason}</EmailBody>}
      <EmailBody style={{ fontSize: "13px", margin: 0 }}>
        {`You're welcome to reapply in the future as your agency grows.`}
      </EmailBody>
    </BaseEmailLayout>
  );
}

export default AgencyRejectionEmail;
