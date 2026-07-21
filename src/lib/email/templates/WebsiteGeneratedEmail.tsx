import { BaseEmailLayout, EmailHeading, EmailBody, EmailButton } from "./BaseEmailLayout";

export interface WebsiteGeneratedEmailProps {
  firstName: string;
  businessName: string;
  previewUrl: string;
}

export function WebsiteGeneratedEmail({
  firstName,
  businessName,
  previewUrl,
}: WebsiteGeneratedEmailProps) {
  return (
    <BaseEmailLayout preview={`Your ${businessName} website is ready to preview.`}>
      <EmailHeading>Your website is ready to preview.</EmailHeading>
      <EmailBody>
        {`Hi ${firstName}, your AI-generated website for ${businessName} is ready. Review it, make any edits you like, and publish it when you're happy.`}
      </EmailBody>
      <EmailButton href={previewUrl}>Preview my website</EmailButton>
      <EmailBody>
        {`You can edit any section, swap images, and regenerate copy directly from your dashboard.`}
      </EmailBody>
    </BaseEmailLayout>
  );
}

export default WebsiteGeneratedEmail;
