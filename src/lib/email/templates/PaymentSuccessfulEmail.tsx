// src/lib/email/templates/PaymentSuccessfulEmail.tsx

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

export interface PaymentSuccessfulEmailProps {
  firstName: string;
  planName: string;
  billingCycle: string;
  nextBillingDate: string;
  dashboardUrl: string;
}

export function PaymentSuccessfulEmail({
  firstName,
  planName,
  billingCycle,
  nextBillingDate,
  dashboardUrl,
}: PaymentSuccessfulEmailProps) {
  return (
    <BaseEmailLayout preview={`Welcome to Zuri ${planName} — you're all set`}>
      <EmailEyebrow>Payment Confirmed</EmailEyebrow>
      <EmailHeading>{`You're on Zuri ${planName}, ${firstName}.`}</EmailHeading>
      <EmailBody>
        {`Your payment went through and your plan is active immediately — nothing further to do. Here's what's on file:`}
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
          Subscription
        </EmailText>
        <EmailHighlight label="Plan" value={planName} />
        <EmailHighlight label="Billing cycle" value={billingCycle} />
        <EmailHighlight label="Next billing date" value={nextBillingDate} />
      </EmailCard>

      <EmailButton href={dashboardUrl}>Go to my dashboard</EmailButton>
      <EmailDivider />
      <EmailBody style={{ fontSize: "13px", margin: 0 }}>
        {`Need a receipt for your records, or want to change plans later? You can manage billing any time from your dashboard.`}
      </EmailBody>
    </BaseEmailLayout>
  );
}

export default PaymentSuccessfulEmail;
