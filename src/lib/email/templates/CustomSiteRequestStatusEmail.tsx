import { BaseEmailLayout, EmailHeading, EmailBody } from "./BaseEmailLayout";

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
  const heading =
    status === "approved"
      ? "Your custom project was approved."
      : status === "declined"
        ? "Update on your custom project request."
        : "Your custom project is in review.";

  const body =
    status === "approved"
      ? `Great news — your ${projectTypeLabel} request was approved. Our team will reach out shortly with next steps for kickoff.`
      : status === "declined"
        ? `We've reviewed your ${projectTypeLabel} request and won't be proceeding with a custom build at this time. You can still create a self-serve AI site from your Zuri dashboard.`
        : `We're reviewing your ${projectTypeLabel} request and will update you soon.`;

  return (
    <BaseEmailLayout preview={heading}>
      <EmailHeading>
        {firstName ? `${firstName}, ` : ""}
        {heading}
      </EmailHeading>
      <EmailBody>{body}</EmailBody>
      {notes ? <EmailBody>{notes}</EmailBody> : null}
    </BaseEmailLayout>
  );
}

export default CustomSiteRequestStatusEmail;
