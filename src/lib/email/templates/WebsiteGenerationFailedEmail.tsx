// src/lib/email/templates/WebsiteGenerationFailedEmail.tsx

import {
  BaseEmailLayout,
  EmailEyebrow,
  EmailHeading,
  EmailBody,
  EmailButton,
  EmailDivider,
} from "./BaseEmailLayout";

export interface WebsiteGenerationFailedEmailProps {
  firstName: string;
  retryUrl: string;
}

export function WebsiteGenerationFailedEmail({
  firstName,
  retryUrl,
}: WebsiteGenerationFailedEmailProps) {
  return (
    <BaseEmailLayout preview="We hit a snag generating your website.">
      <EmailEyebrow>Generation Issue</EmailEyebrow>
      <EmailHeading>{`We hit a snag, ${firstName}.`}</EmailHeading>
      <EmailBody>
        {`Something interrupted your website generation before it finished. This is almost always temporary — your details are saved, so trying again picks up right where you left off.`}
      </EmailBody>
      <EmailButton href={retryUrl}>Try again</EmailButton>
      <EmailDivider />
      <EmailBody style={{ fontSize: "13px", margin: 0 }}>
        {`Still stuck after a second attempt? Reply to this email and our team will look into it directly.`}
      </EmailBody>
    </BaseEmailLayout>
  );
}

export default WebsiteGenerationFailedEmail;
