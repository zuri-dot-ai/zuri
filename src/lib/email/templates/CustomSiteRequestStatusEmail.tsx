// src/lib/email/templates/CustomSiteRequestStatusEmail.tsx

import {
  BaseEmailLayout,
  EmailEyebrow,
  EmailHeading,
  EmailBody,
} from "./BaseEmailLayout";

export interface CustomSiteRequestStatusEmailProps {
  firstName: string;
  projectTypeLabel: string;
  status: "approved" | "declined" | "in_review";
  notes?: string;
}

export function CustomSiteRequestStatusEmail({
  firstName,
  projectTypeLabel,
  status,
  notes,
}: CustomSiteRequestStatusEmailProps) {
  const eyebrow =
    status === "approved"
      ? "Request Approved"
      : status === "declined"
        ? "Request Update"
        : "Request In Review";

  const heading =
    status === "approved"
      ? `Your ${projectTypeLabel} project is approved.`
      : status === "declined"
        ? "An update on your custom project."
        : "Your project is being reviewed.";

  const body =
    status === "approved"
      ? `Great news — our team is moving forward with your ${projectTypeLabel} build. Expect an email shortly with next steps for kickoff.`
      : status === "declined"
        ? `We've reviewed your ${projectTypeLabel} request and won't be proceeding with a custom build at this time. You can still create a self-serve AI-generated site any time from your dashboard.`
        : `We're currently reviewing your ${projectTypeLabel} request and will follow up soon with an update.`;

  return (
    <BaseEmailLayout preview={heading}>
      <EmailEyebrow>{eyebrow}</EmailEyebrow>
      <EmailHeading>{`${firstName ? `${firstName}, ` : ""}${heading.charAt(0).toLowerCase()}${heading.slice(1)}`}</EmailHeading>
      <EmailBody>{body}</EmailBody>
      {notes ? <EmailBody style={{ fontSize: "13px", margin: 0 }}>{notes}</EmailBody> : null}
    </BaseEmailLayout>
  );
}

export default CustomSiteRequestStatusEmail;
