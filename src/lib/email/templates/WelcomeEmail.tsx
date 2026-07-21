import {
  BaseEmailLayout,
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
      preview={`Welcome to Zuri, ${firstName}! Your business presence starts now.`}
    >
      <EmailHeading>Welcome to Zuri, {firstName}.</EmailHeading>
      <EmailBody>
        {`You've just joined thousands of African entrepreneurs building a professional online presence. In the next few minutes, we'll create your website and content strategy — powered by AI, built for your business.`}
      </EmailBody>
      <EmailBody>
        {`Let's get started. Answer a few quick questions about your business and we'll handle the rest.`}
      </EmailBody>
      <EmailButton href={onboardingUrl}>Set up my business profile</EmailButton>
      <EmailDivider />
      <EmailBody>
        {`Questions? Reply to this email and our team will get back to you.`}
      </EmailBody>
    </BaseEmailLayout>
  );
}

export default WelcomeEmail;
