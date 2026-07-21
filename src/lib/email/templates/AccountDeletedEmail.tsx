// TODO: copywriting — stub only, doc §2.1
import { BaseEmailLayout, EmailHeading, EmailBody } from "./BaseEmailLayout";

export interface AccountDeletedEmailProps {
  firstName: string | null;
}

export function AccountDeletedEmail({ firstName }: AccountDeletedEmailProps) {
  return (
    <BaseEmailLayout preview="Your Zuri account has been deleted">
      <EmailHeading>Your account has been deleted.</EmailHeading>
      <EmailBody>
        {`${firstName ? `Hi ${firstName}, ` : ""}your Zuri account and all associated data have been permanently deleted.`}
      </EmailBody>
    </BaseEmailLayout>
  );
}

export default AccountDeletedEmail;
