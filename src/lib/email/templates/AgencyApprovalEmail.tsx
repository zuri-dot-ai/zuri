// src/lib/email/templates/AgencyApprovalEmail.tsx

import {
  BaseEmailLayout,
  EmailEyebrow,
  EmailHeading,
  EmailBody,
  EmailButton,
} from "./BaseEmailLayout";

export interface AgencyApprovalEmailProps {
  agencyName: string;
  listingUrl: string;
}

export function AgencyApprovalEmail({ agencyName, listingUrl }: AgencyApprovalEmailProps) {
  return (
    <BaseEmailLayout preview={`${agencyName} is now live on Zuri`}>
      <EmailEyebrow>You're Listed</EmailEyebrow>
      <EmailHeading>{`${agencyName} is live on Zuri.`}</EmailHeading>
      <EmailBody>
        {`Your listing is approved and visible in the marketplace right now — business owners across the platform can find and reach out to you directly.`}
      </EmailBody>
      <EmailButton href={listingUrl}>View my listing</EmailButton>
    </BaseEmailLayout>
  );
}

export default AgencyApprovalEmail;
