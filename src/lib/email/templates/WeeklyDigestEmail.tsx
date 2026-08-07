// src/lib/email/templates/WeeklyDigestEmail.tsx

import {
  BaseEmailLayout,
  EmailEyebrow,
  EmailHeading,
  EmailBody,
  EmailButton,
  EmailDivider,
  EmailCard,
  EmailHighlight,
  EmailStat,
  BRAND,
} from "./BaseEmailLayout";
import { Text as EmailText } from "@react-email/components";

export interface WeeklyDigestEmailProps {
  firstName: string;
  businessName: string;
  weeklyViews: number | null;
  viewsChange: number | null;
  postsScheduledThisWeek: number;
  imagesUsed: number;
  imageLimit: number | null;
  dashboardUrl: string;
}

export function WeeklyDigestEmail({
  firstName,
  businessName,
  weeklyViews,
  viewsChange,
  postsScheduledThisWeek,
  imagesUsed,
  imageLimit,
  dashboardUrl,
}: WeeklyDigestEmailProps) {
  return (
    <BaseEmailLayout preview={`Your week at a glance — ${businessName}`}>
      <EmailEyebrow>Weekly Digest</EmailEyebrow>
      <EmailHeading>{`Good morning, ${firstName}.`}</EmailHeading>
      <EmailBody>{`Here's how ${businessName} performed this past week.`}</EmailBody>

      {weeklyViews !== null && (
        <>
          <EmailStat
            value={weeklyViews.toLocaleString()}
            caption="visitors this week"
          />
          {viewsChange !== null && (
            <EmailText
              style={{
                color: viewsChange >= 0 ? BRAND.success : BRAND.error,
                fontSize: "13px",
                margin: "6px 0 0",
              }}
            >
              {`${viewsChange >= 0 ? "+" : ""}${viewsChange}% vs last week`}
            </EmailText>
          )}
          <EmailDivider />
        </>
      )}

      <EmailCard>
        <EmailHighlight label="Posts scheduled" value={`${postsScheduledThisWeek} posts`} />
        {imageLimit !== null && (
          <EmailHighlight
            label="Images used"
            value={`${imagesUsed} of ${imageLimit} this month`}
          />
        )}
      </EmailCard>

      <EmailButton href={dashboardUrl}>Open my dashboard</EmailButton>
    </BaseEmailLayout>
  );
}

export default WeeklyDigestEmail;
