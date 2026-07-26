import {
  BaseEmailLayout,
  EmailHeading,
  EmailBody,
  EmailDivider,
  EmailHighlight,
  EmailButton,
} from "./BaseEmailLayout";

export interface NewCustomSiteRequestAlertEmailProps {
  projectTypeLabel: string;
  userName: string;
  userEmail: string;
  description: string;
  features: string;
  timeline: string;
  budgetRange?: string;
  adminUrl?: string;
}

export function NewCustomSiteRequestAlertEmail({
  projectTypeLabel,
  userName,
  userEmail,
  description,
  features,
  timeline,
  budgetRange,
  adminUrl,
}: NewCustomSiteRequestAlertEmailProps) {
  return (
    <BaseEmailLayout preview={`New custom site request: ${projectTypeLabel}`}>
      <EmailHeading>New custom site request.</EmailHeading>
      <EmailBody>
        {`A user submitted a custom backend/CMS build request.`}
      </EmailBody>
      <EmailDivider />
      <EmailHighlight label="Project type" value={projectTypeLabel} />
      <EmailHighlight label="Contact" value={userName} />
      <EmailHighlight label="Email" value={userEmail} />
      <EmailHighlight label="Timeline" value={timeline} />
      {budgetRange ? (
        <EmailHighlight label="Budget" value={budgetRange} />
      ) : null}
      <EmailHighlight label="Features" value={features} />
      <EmailHighlight label="Description" value={description} />
      <EmailDivider />
      {adminUrl ? (
        <EmailButton href={adminUrl}>Review in admin</EmailButton>
      ) : (
        <EmailBody>{`Review it in the admin panel.`}</EmailBody>
      )}
    </BaseEmailLayout>
  );
}

export default NewCustomSiteRequestAlertEmail;
