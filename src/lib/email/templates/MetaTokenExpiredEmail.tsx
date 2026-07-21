// TODO: copywriting — stub only, doc §2.5
import { BaseEmailLayout, EmailHeading, EmailBody, EmailButton } from "./BaseEmailLayout";

export interface MetaTokenExpiredEmailProps {
  firstName: string;
  reconnectUrl: string;
}

export function MetaTokenExpiredEmail({ firstName, reconnectUrl }: MetaTokenExpiredEmailProps) {
  return (
    <BaseEmailLayout preview="Your Meta connection has expired">
      <EmailHeading>Reconnect your Meta account.</EmailHeading>
      <EmailBody>
        {`Hi ${firstName}, your Meta connection has expired. Reconnect to continue seeing social insights.`}
      </EmailBody>
      <EmailButton href={reconnectUrl}>Reconnect</EmailButton>
    </BaseEmailLayout>
  );
}

export default MetaTokenExpiredEmail;
