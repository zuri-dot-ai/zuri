// src/lib/email/templates/GracePeriodStartedEmail.tsx

import { Text as EmailText } from "@react-email/components";
import {
  BaseEmailLayout,
  EmailEyebrow,
  EmailHeading,
  EmailBody,
  EmailButton,
  EmailCard,
  EmailHighlight,
  BRAND,
  FONT_BODY,
} from "./BaseEmailLayout";

export interface GracePeriodStartedEmailProps {
  firstName: string;
  gracePeriodEnd: string;
  updatePaymentUrl: string;
}

export function GracePeriodStartedEmail({
  firstName,
  gracePeriodEnd,
  updatePaymentUrl,
}: GracePeriodStartedEmailProps) {
  return (
    <BaseEmailLayout preview="Your Zuri grace period has started">
      <EmailEyebrow>Grace Period</EmailEyebrow>
      <EmailHeading>{`You've got time to sort this out, ${firstName}.`}</EmailHeading>
      <EmailBody>
        {`Your last payment didn't go through, but your account and website stay fully active during your grace period. Update your payment details whenever suits you before then.`}
      </EmailBody>

      <EmailCard>
        <EmailText
          style={{
            color: BRAND.textTertiary,
            fontFamily: FONT_BODY,
            fontSize: "11px",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            margin: "0 0 14px",
          }}
        >
          Grace period
        </EmailText>
        <EmailHighlight label="Access continues until" value={gracePeriodEnd} />
      </EmailCard>

      <EmailButton href={updatePaymentUrl}>Update payment method</EmailButton>
    </BaseEmailLayout>
  );
}

export default GracePeriodStartedEmail;
