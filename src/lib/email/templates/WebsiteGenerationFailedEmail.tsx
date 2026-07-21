import { BaseEmailLayout, EmailHeading, EmailBody, EmailButton } from "./BaseEmailLayout";

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
      <EmailHeading>We couldn&apos;t generate your website.</EmailHeading>
      <EmailBody>
        {`Hi ${firstName}, something went wrong while generating your website. This is usually temporary — please try again.`}
      </EmailBody>
      <EmailButton href={retryUrl}>Try again</EmailButton>
      <EmailBody>
        {`If this keeps happening, reply to this email and our team will help directly.`}
      </EmailBody>
    </BaseEmailLayout>
  );
}

export default WebsiteGenerationFailedEmail;
