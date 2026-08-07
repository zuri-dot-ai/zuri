// src/lib/email/templates/SearchConsoleExpiredEmail.tsx

import {
  BaseEmailLayout,
  EmailEyebrow,
  EmailHeading,
  EmailBody,
  EmailButton,
} from "./BaseEmailLayout";

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
      <EmailEyebrow>Reconnect Needed</EmailEyebrow>
      <EmailHeading>{`Your Google connection needs a refresh, ${firstName}.`}</EmailHeading>
      <EmailBody>
        {`Your Search Console access has expired. Reconnect to keep seeing how your website performs in Google search — it only takes a moment.`}
      </EmailBody>
      <EmailButton href={reconnectUrl}>Reconnect Google</EmailButton>
    </BaseEmailLayout>
  );
}

export default SearchConsoleExpiredEmail;
