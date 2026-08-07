// src/lib/email/templates/PasswordResetEmail.tsx

import {
  BaseEmailLayout,
  EmailEyebrow,
  EmailHeading,
  EmailBody,
  EmailButton,
} from "./BaseEmailLayout";

export interface PasswordResetEmailProps {
  resetUrl: string;
}

export function PasswordResetEmail({ resetUrl }: PasswordResetEmailProps) {
  return (
    <BaseEmailLayout preview="Reset your Zuri password">
      <EmailEyebrow>Password Reset</EmailEyebrow>
      <EmailHeading>Let's get you back in.</EmailHeading>
      <EmailBody>
        {`Click below to choose a new password. This link is valid for 1 hour and can only be used once.`}
      </EmailBody>
      <EmailButton href={resetUrl}>Reset password</EmailButton>
      <EmailBody style={{ fontSize: "13px", margin: 0 }}>
        {`Didn't request this? You can safely ignore this email — your password won't change.`}
      </EmailBody>
    </BaseEmailLayout>
  );
}

export default PasswordResetEmail;
