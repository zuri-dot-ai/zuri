// TODO: copywriting — stub only, doc §2.3
import { BaseEmailLayout, EmailHeading, EmailBody } from "./BaseEmailLayout";

export interface DomainConnectedEmailProps {
  firstName: string;
  domain: string;
}

export function DomainConnectedEmail({ firstName, domain }: DomainConnectedEmailProps) {
  return (
    <BaseEmailLayout preview={`${domain} is connected to your Zuri website`}>
      <EmailHeading>Your custom domain is connected.</EmailHeading>
      <EmailBody>
        {`Hi ${firstName}, ${domain} is now pointing to your Zuri website.`}
      </EmailBody>
    </BaseEmailLayout>
  );
}

export default DomainConnectedEmail;
