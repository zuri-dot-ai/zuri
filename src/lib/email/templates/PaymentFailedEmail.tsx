// src/lib/email/templates/PaymentFailedEmail.tsx

import { Text as EmailText } from "@react-email/components";
import {
  BaseEmailLayout,
  EmailEyebrow,
  EmailHeading,
  EmailBody,
  EmailButton,
  EmailDivider,
  EmailCard,
  EmailHighlight,
  BRAND,
  FONT_BODY,
} from "./BaseEmailLayout";

export interface PaymentFailedEmailProps {
  firstName: string;
  planName: string;
  gracePeriodEnd: string;
  updatePaymentUrl: string;
}

export function PaymentFailedEmail({
  firstName,
  planName,
  gracePeriodEnd,
  updatePaymentUrl,
}: PaymentFailedEmailProps) {
  return (
    <BaseEmailLayout preview="Action required: your Zuri payment failed">
      <EmailEyebrow>Payment Issue</EmailEyebrow>
      <EmailHeading>{`We couldn't charge your card, ${firstName}.`}</EmailHeading>
      <EmailBody>
        {`This happens for ordinary reasons — an expired card, a bank decline, insufficient funds. Your ${planName} plan is still active for now, so there's no need to rush.`}
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
          What happens next
        </EmailText>
        <EmailHighlight label="Plan" value={planName} />
        <EmailHighlight label="Access continues until" value={gracePeriodEnd} />
      </EmailCard>

      <EmailButton href={updatePaymentUrl}>Update payment method</EmailButton>
      <EmailDivider />
      <EmailBody style={{ fontSize: "13px", margin: 0 }}>
        {`Questions about the charge? Reply to this email — our team can help directly.`}
      </EmailBody>
    </BaseEmailLayout>
  );
}

export default PaymentFailedEmail;
