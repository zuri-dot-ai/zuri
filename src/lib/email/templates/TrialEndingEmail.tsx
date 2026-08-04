// src/lib/email/templates/TrialEndingEmail.tsx

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

export interface TrialEndingEmailProps {
  firstName: string;
  daysLeft: number;
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

export function TrialEndingEmail({
  firstName,
  daysLeft,
  upgradeUrl,
  planName = "your",
  lossSummary,
}: TrialEndingEmailProps) {
  const dayLabel = daysLeft === 1 ? "1 day" : `${daysLeft} days`;
  const losses = lossSummary
    ? lossSummary.split(",").map((s) => s.trim())
    : DEFAULT_LOSSES;

  return (
    <BaseEmailLayout preview={`Your Zuri trial ends in ${dayLabel}`}>
      <EmailEyebrow>Trial Ending</EmailEyebrow>
      <EmailHeading>{`${dayLabel} left on your ${planName} trial, ${firstName}.`}</EmailHeading>
      <EmailBody>
        {`No card is on file, so nothing will be charged automatically. When the trial ends, your account moves to Free — and you'll lose access to:`}
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

      <EmailBody>{`Upgrade now and keep everything running exactly as it is.`}</EmailBody>
      <EmailButton href={upgradeUrl}>Upgrade your plan</EmailButton>
    </BaseEmailLayout>
  );
}

export default TrialEndingEmail;
