import {
  BaseEmailLayout,
  EmailHeading,
  EmailBody,
  EmailDivider,
  EmailHighlight,
  EmailButton,
} from "./BaseEmailLayout";

export interface NewAgencyApplicationAlertEmailProps {
  agencyName: string;
  contactName: string;
  email: string;
  services: string;
  location?: string;
  primarySpecialty?: string;
  adminUrl?: string;
}

export function NewAgencyApplicationAlertEmail({
  agencyName,
  contactName,
  email,
  services,
  location,
  primarySpecialty,
  adminUrl,
}: NewAgencyApplicationAlertEmailProps) {
  return (
    <BaseEmailLayout preview={`New agency application: ${agencyName}`}>
      <EmailHeading>New agency application.</EmailHeading>
      <EmailBody>
        {`A new agency has applied to join the Zuri marketplace.`}
      </EmailBody>
      <EmailDivider />
      <EmailHighlight label="Agency" value={agencyName} />
      <EmailHighlight label="Contact" value={contactName} />
      <EmailHighlight label="Email" value={email} />
      {location ? (
        <EmailHighlight label="Location" value={location} />
      ) : null}
      {primarySpecialty ? (
        <EmailHighlight label="Primary specialty" value={primarySpecialty} />
      ) : null}
      <EmailHighlight label="Services" value={services} />
      <EmailDivider />
      {adminUrl ? (
        <EmailButton href={adminUrl}>Review in admin</EmailButton>
      ) : (
        <EmailBody>{`Review it in the admin panel.`}</EmailBody>
      )}
    </BaseEmailLayout>
  );
}

export default NewAgencyApplicationAlertEmail;
