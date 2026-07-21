import { BaseEmailLayout, EmailHeading, EmailBody } from "./BaseEmailLayout";

export interface AgencyInquirySentEmailProps {
  userName: string | null;
  agencyName: string;
  responseTime: string;
}

export function AgencyInquirySentEmail({
  userName,
  agencyName,
  responseTime,
}: AgencyInquirySentEmailProps) {
  const greeting = userName ? `Hi ${userName},` : "Hi,";
  return (
    <BaseEmailLayout preview={`Your inquiry to ${agencyName} has been sent`}>
      <EmailHeading>Your inquiry has been sent.</EmailHeading>
      <EmailBody>
        {`${greeting} we've forwarded your enquiry to ${agencyName}. They ${responseTime.toLowerCase()}.`}
      </EmailBody>
      <EmailBody>
        {`Your email address was shared with ${agencyName} to facilitate this connection.`}
      </EmailBody>
    </BaseEmailLayout>
  );
}

export default AgencyInquirySentEmail;
