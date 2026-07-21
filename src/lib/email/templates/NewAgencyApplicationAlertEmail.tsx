import { BaseEmailLayout, EmailHeading, EmailBody, EmailDivider, EmailHighlight } from "./BaseEmailLayout";

export interface NewAgencyApplicationAlertEmailProps {
  agencyName: string;
  contactName: string;
  email: string;
  services: string;
}

export function NewAgencyApplicationAlertEmail({
  agencyName,
  contactName,
  email,
  services,
}: NewAgencyApplicationAlertEmailProps) {
  return (
    <BaseEmailLayout preview={`New agency application: ${agencyName}`}>
      <EmailHeading>New agency application.</EmailHeading>
      <EmailBody>{`A new agency has applied to join the Zuri marketplace.`}</EmailBody>
      <EmailDivider />
      <EmailHighlight label="Agency" value={agencyName} />
      <EmailHighlight label="Contact" value={contactName} />
      <EmailHighlight label="Email" value={email} />
      <EmailHighlight label="Services" value={services} />
      <EmailDivider />
      <EmailBody>{`Review it in the admin panel.`}</EmailBody>
    </BaseEmailLayout>
  );
}

export default NewAgencyApplicationAlertEmail;
