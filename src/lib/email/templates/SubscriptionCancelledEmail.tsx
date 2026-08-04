// src/lib/email/templates/SubscriptionCancelledEmail.tsx

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

export interface SubscriptionCancelledEmailProps {
  firstName: string;
  periodEnd: string;
  resubscribeUrl: string;
}

export function SubscriptionCancelledEmail({
  firstName,
  periodEnd,
  resubscribeUrl,
}: SubscriptionCancelledEmailProps) {
  return (
    <BaseEmailLayout preview="Your Zuri subscription has been cancelled">
      <EmailEyebrow>Subscription Cancelled</EmailEyebrow>
      <EmailHeading>{`We've cancelled your subscription, ${firstName}.`}</EmailHeading>
      <EmailBody>
        {`Your plan stays fully active until the date below — no early cutoff. After that, your account moves to Free automatically.`}
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
          Cancellation details
        </EmailText>
        <EmailHighlight label="Access continues until" value={periodEnd} />
      </EmailCard>

      <EmailBody>
        {`Changed your mind, or plans change? You're welcome back any time — nothing to rebuild.`}
      </EmailBody>
      <EmailButton href={resubscribeUrl}>Resubscribe</EmailButton>
    </BaseEmailLayout>
  );
}

export default SubscriptionCancelledEmail;
