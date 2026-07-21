import { BaseEmailLayout, EmailHeading, EmailBody } from "./BaseEmailLayout";

export interface AgencyApplicationConfirmationEmailProps {
  contactName: string;
  agencyName: string;
}

export function AgencyApplicationConfirmationEmail({
  contactName,
  agencyName,
}: AgencyApplicationConfirmationEmailProps) {
  return (
    <BaseEmailLayout preview={`We received ${agencyName}'s application to join Zuri`}>
      <EmailHeading>Thanks for applying, {contactName}.</EmailHeading>
      <EmailBody>
        {`We received ${agencyName}'s application to be listed on the Zuri agency marketplace.`}
      </EmailBody>
      <EmailBody>
        {`We review all applications within 7 business days and will be in touch by email.`}
      </EmailBody>
    </BaseEmailLayout>
  );
}

export default AgencyApplicationConfirmationEmail;
