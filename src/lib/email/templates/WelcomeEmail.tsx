// src/lib/email/templates/WelcomeEmail.tsx

import {
  BaseEmailLayout,
  EmailEyebrow,
  EmailHeading,
  EmailBody,
  EmailButton,
  EmailDivider,
} from "./BaseEmailLayout";

export interface WelcomeEmailProps {
  firstName: string;
  onboardingUrl: string;
}

export function WelcomeEmail({ firstName, onboardingUrl }: WelcomeEmailProps) {
  return (
    <BaseEmailLayout
      preview={`Welcome to Zuri, ${firstName}. Your business presence starts now.`}
    >
      <EmailEyebrow>Welcome to Zuri</EmailEyebrow>
      <EmailHeading>{`${firstName}, your business is about to look the part.`}</EmailHeading>
      <EmailBody>
        {`Most small businesses across Africa are still competing without a real online presence — no website, no proof of legitimacy, nothing to send a customer who asks "do you have a site?" You just fixed that.`}
      </EmailBody>
      <EmailBody>
        {`Answer a few questions about what you do and who you serve. We'll generate a site built specifically for your business — not a template with your name dropped in.`}
      </EmailBody>
      <EmailButton href={onboardingUrl}>Build my website</EmailButton>
      <EmailDivider />
      <EmailBody style={{ fontSize: "13px", margin: 0 }}>
        {`Questions along the way? Just reply to this email — a real person on the Zuri team will get back to you.`}
      </EmailBody>
    </BaseEmailLayout>
  );
}

export default WelcomeEmail;
