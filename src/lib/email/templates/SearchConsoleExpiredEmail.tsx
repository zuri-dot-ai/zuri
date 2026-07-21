// TODO: copywriting — stub only, doc §2.5
import { BaseEmailLayout, EmailHeading, EmailBody, EmailButton } from "./BaseEmailLayout";

export interface SearchConsoleExpiredEmailProps {
  firstName: string;
  reconnectUrl: string;
}

export function SearchConsoleExpiredEmail({
  firstName,
  reconnectUrl,
}: SearchConsoleExpiredEmailProps) {
  return (
    <BaseEmailLayout preview="Your Search Console connection has expired">
      <EmailHeading>Reconnect Google Search Console.</EmailHeading>
      <EmailBody>
        {`Hi ${firstName}, your Google connection has expired. Reconnect to restore search data.`}
      </EmailBody>
      <EmailButton href={reconnectUrl}>Reconnect</EmailButton>
    </BaseEmailLayout>
  );
}

export default SearchConsoleExpiredEmail;
