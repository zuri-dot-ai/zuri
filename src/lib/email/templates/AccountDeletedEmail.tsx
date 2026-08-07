// src/lib/email/templates/AccountDeletedEmail.tsx

import {
  BaseEmailLayout,
  EmailEyebrow,
  EmailHeading,
  EmailBody,
} from "./BaseEmailLayout";

export interface AccountDeletedEmailProps {
  firstName: string | null;
}

export function AccountDeletedEmail({ firstName }: AccountDeletedEmailProps) {
  return (
    <BaseEmailLayout preview="Your Zuri account has been deleted">
      <EmailEyebrow>Account Deleted</EmailEyebrow>
      <EmailHeading>Your account has been deleted.</EmailHeading>
      <EmailBody>
        {`${firstName ? `Hi ${firstName}, ` : ""}your Zuri account and all associated data — your website, content, and settings — have been permanently deleted, as requested.`}
      </EmailBody>
      <EmailBody style={{ fontSize: "13px", margin: 0 }}>
        {`If this wasn't you, please contact us immediately by replying to this email.`}
      </EmailBody>
    </BaseEmailLayout>
  );
}

export default AccountDeletedEmail;
