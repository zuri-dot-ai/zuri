// src/lib/email/templates/NewAgencyApplicationAlertEmail.tsx

import {
  BaseEmailLayout,
  EmailEyebrow,
  EmailHeading,
  EmailBody,
  EmailButton,
  EmailCard,
  EmailHighlight,
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
      <EmailEyebrow>New Application</EmailEyebrow>
      <EmailHeading>{`${agencyName} wants to join the marketplace.`}</EmailHeading>
      <EmailBody>{`A new agency has applied. Details below:`}</EmailBody>

      <EmailCard>
        <EmailHighlight label="Agency" value={agencyName} />
        <EmailHighlight label="Contact" value={contactName} />
        <EmailHighlight label="Email" value={email} />
        {location ? <EmailHighlight label="Location" value={location} /> : null}
        {primarySpecialty ? (
          <EmailHighlight label="Primary specialty" value={primarySpecialty} />
        ) : null}
        <EmailHighlight label="Services" value={services} />
      </EmailCard>

      {adminUrl ? (
        <EmailButton href={adminUrl}>Review in admin</EmailButton>
      ) : (
        <EmailBody>{`Review it in the admin panel.`}</EmailBody>
      )}
    </BaseEmailLayout>
  );
}

export default NewAgencyApplicationAlertEmail;
