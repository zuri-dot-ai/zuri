import { BaseEmailLayout, EmailHeading, EmailBody, EmailButton } from "./BaseEmailLayout";

export interface WebsitePublishedEmailProps {
  firstName: string;
  siteUrl: string;
}

export function WebsitePublishedEmail({ firstName, siteUrl }: WebsitePublishedEmailProps) {
  return (
    <BaseEmailLayout preview="Your website is live on Zuri.">
      <EmailHeading>Your website is live.</EmailHeading>
      <EmailBody>
        {`Hi ${firstName}, your website is now live and visible to the world.`}
      </EmailBody>
      <EmailButton href={siteUrl}>Visit my website</EmailButton>
      <EmailBody>
        {`You can edit copy, swap your theme, and update images any time from your dashboard.`}
      </EmailBody>
    </BaseEmailLayout>
  );
}

export default WebsitePublishedEmail;
