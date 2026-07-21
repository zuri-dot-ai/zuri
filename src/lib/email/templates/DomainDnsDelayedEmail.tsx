// TODO: copywriting — stub only, doc §2.3
import { BaseEmailLayout, EmailHeading, EmailBody, EmailButton } from "./BaseEmailLayout";

export interface DomainDnsDelayedEmailProps {
  firstName: string;
  domain: string;
  setupGuideUrl: string;
}

export function DomainDnsDelayedEmail({
  firstName,
  domain,
  setupGuideUrl,
}: DomainDnsDelayedEmailProps) {
  return (
    <BaseEmailLayout preview={`${domain} DNS still hasn't propagated`}>
      <EmailHeading>Your domain isn&apos;t connected yet.</EmailHeading>
      <EmailBody>
        {`Hi ${firstName}, it's been over 48 hours and ${domain} still hasn't propagated. Double-check your DNS records.`}
      </EmailBody>
      <EmailButton href={setupGuideUrl}>View setup guide</EmailButton>
    </BaseEmailLayout>
  );
}

export default DomainDnsDelayedEmail;
