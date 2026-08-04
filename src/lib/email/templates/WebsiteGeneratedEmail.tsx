// src/lib/email/templates/WebsiteGeneratedEmail.tsx

import {
  BaseEmailLayout,
  EmailEyebrow,
  EmailHeading,
  EmailBody,
  EmailButton,
  EmailDivider,
} from "./BaseEmailLayout";

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
      <EmailEyebrow>Preview Ready</EmailEyebrow>
      <EmailHeading>{`${businessName} has a website now, ${firstName}.`}</EmailHeading>
      <EmailBody>
        {`It's built, styled, and ready for you to look over — nothing generic, this was generated specifically around what you told us about your business.`}
      </EmailBody>
      <EmailButton href={previewUrl}>Preview my website</EmailButton>
      <EmailDivider />
      <EmailBody style={{ fontSize: "13px", margin: 0 }}>
        {`Not quite right yet? Edit any section, swap images, or regenerate copy — then publish whenever it feels ready.`}
      </EmailBody>
    </BaseEmailLayout>
  );
}

export default WebsiteGeneratedEmail;
