import { BaseEmailLayout, EmailHeading, EmailBody, EmailButton } from "./BaseEmailLayout";

export interface AgencyApprovalEmailProps {
  agencyName: string;
  listingUrl: string;
}

export function AgencyApprovalEmail({ agencyName, listingUrl }: AgencyApprovalEmailProps) {
  return (
    <BaseEmailLayout preview={`${agencyName} is now live on Zuri`}>
      <EmailHeading>You&apos;re listed on Zuri.</EmailHeading>
      <EmailBody>
        {`Congratulations — ${agencyName} is now live on the Zuri agency marketplace.`}
      </EmailBody>
      <EmailButton href={listingUrl}>View my listing</EmailButton>
    </BaseEmailLayout>
  );
}

export default AgencyApprovalEmail;
