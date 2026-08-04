// src/lib/email/templates/TrialExpiredEmail.tsx

import { Text as EmailText } from "@react-email/components";
import {
  BaseEmailLayout,
  EmailEyebrow,
  EmailHeading,
  EmailBody,
  EmailButton,
  EmailCard,
  BRAND,
  FONT_BODY,
} from "./BaseEmailLayout";

export interface TrialExpiredEmailProps {
  firstName: string;
  upgradeUrl: string;
  planName?: string;
  lossSummary?: string;
}

const DEFAULT_LOSSES = [
  "Publishing your website",
  "Content calendar",
  "AI-generated images",
  "Agency marketplace",
];

export function TrialExpiredEmail({
  firstName,
  upgradeUrl,
  planName = "trial",
  lossSummary,
}: TrialExpiredEmailProps) {
  const losses = lossSummary
    ? lossSummary.split(",").map((s) => s.trim())
    : DEFAULT_LOSSES;

  return (
    <BaseEmailLayout preview="Your Zuri trial has ended">
      <EmailEyebrow>Trial Ended</EmailEyebrow>
      <EmailHeading>{`Your ${planName} has ended, ${firstName}.`}</EmailHeading>
      <EmailBody>
        {`Nothing was charged — your account has simply moved to Free. You no longer have access to:`}
      </EmailBody>

      <EmailCard>
        {losses.map((item, i) => (
          <EmailText
            key={item}
            style={{
              color: BRAND.textPrimary,
              fontFamily: FONT_BODY,
              fontSize: "14px",
              margin: i === losses.length - 1 ? 0 : "0 0 10px",
            }}
          >
            {`— ${item}`}
          </EmailText>
        ))}
      </EmailCard>

      <EmailBody>
        {`Upgrade whenever you're ready — no need to restart a trial, everything picks back up immediately.`}
      </EmailBody>
      <EmailButton href={upgradeUrl}>Choose a plan</EmailButton>
    </BaseEmailLayout>
  );
}

export default TrialExpiredEmail;
