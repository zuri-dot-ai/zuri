// src/lib/email/templates/WebsitePublishedEmail.tsx

import { Text as EmailText } from "@react-email/components";
import {
  BaseEmailLayout,
  EmailEyebrow,
  EmailHeading,
  EmailBody,
  EmailButton,
  EmailDivider,
  EmailCard,
  BRAND,
  FONT_BODY,
} from "./BaseEmailLayout";

export interface WebsitePublishedEmailProps {
  firstName: string;
  siteUrl: string;
}

export function WebsitePublishedEmail({ firstName, siteUrl }: WebsitePublishedEmailProps) {
  // Strip protocol for a cleaner display URL inside the card
  const displayUrl = siteUrl.replace(/^https?:\/\//, "");

  return (
    <BaseEmailLayout preview="Your website is live on Zuri.">
      <EmailEyebrow>Website Live</EmailEyebrow>
      <EmailHeading>{`It's live, ${firstName}.`}</EmailHeading>
      <EmailBody>
        {`Your website is published and reachable by anyone, anywhere — customers, suppliers, partners. Whatever you were building toward, this is the moment it became real.`}
      </EmailBody>

      <EmailCard>
        <EmailText
          style={{
            color: BRAND.textTertiary,
            fontFamily: FONT_BODY,
            fontSize: "11px",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            margin: "0 0 6px",
          }}
        >
          Your site
        </EmailText>
        <EmailText
          style={{
            color: BRAND.gold,
            fontFamily: FONT_BODY,
            fontSize: "16px",
            fontWeight: 600,
            margin: 0,
            wordBreak: "break-all",
          }}
        >
          {displayUrl}
        </EmailText>
      </EmailCard>

      <EmailButton href={siteUrl}>Visit my website</EmailButton>
      <EmailDivider />
      <EmailBody style={{ fontSize: "13px", margin: 0 }}>
        {`You're not locked in — copy, images, and your theme can all be updated any time from your dashboard.`}
      </EmailBody>
    </BaseEmailLayout>
  );
}

export default WebsitePublishedEmail;
