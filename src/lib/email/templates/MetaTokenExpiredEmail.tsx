// src/lib/email/templates/MetaTokenExpiredEmail.tsx

import {
  BaseEmailLayout,
  EmailEyebrow,
  EmailHeading,
  EmailBody,
  EmailButton,
} from "./BaseEmailLayout";

export interface MetaTokenExpiredEmailProps {
  firstName: string;
  reconnectUrl: string;
}

export function MetaTokenExpiredEmail({ firstName, reconnectUrl }: MetaTokenExpiredEmailProps) {
  return (
    <BaseEmailLayout preview="Your Meta connection has expired">
      <EmailEyebrow>Reconnect Needed</EmailEyebrow>
      <EmailHeading>{`Your Meta connection needs a refresh, ${firstName}.`}</EmailHeading>
      <EmailBody>
        {`Meta access tokens expire periodically for security. Reconnect your account to keep seeing your Instagram and Facebook insights inside Zuri — it only takes a moment.`}
      </EmailBody>
      <EmailButton href={reconnectUrl}>Reconnect Meta</EmailButton>
    </BaseEmailLayout>
  );
}

export default MetaTokenExpiredEmail;
