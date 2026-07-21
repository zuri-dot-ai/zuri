// TODO: copywriting — stub only, doc §2.1
import { BaseEmailLayout, EmailHeading, EmailBody, EmailButton } from "./BaseEmailLayout";

export interface PasswordResetEmailProps {
  resetUrl: string;
}

export function PasswordResetEmail({ resetUrl }: PasswordResetEmailProps) {
  return (
    <BaseEmailLayout preview="Reset your Zuri password">
      <EmailHeading>Reset your password.</EmailHeading>
      <EmailBody>{`Click below to choose a new password. This link expires in 1 hour.`}</EmailBody>
      <EmailButton href={resetUrl}>Reset password</EmailButton>
    </BaseEmailLayout>
  );
}

export default PasswordResetEmail;
