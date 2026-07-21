import { Text } from "@react-email/components";
import {
  BaseEmailLayout,
  EmailHeading,
  EmailBody,
  EmailButton,
  EmailDivider,
  EmailHighlight,
} from "./BaseEmailLayout";

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
      <EmailHeading>{`Good morning, ${firstName}.`}</EmailHeading>
      <EmailBody>{`Here's a quick look at how ${businessName} performed this past week.`}</EmailBody>

      {weeklyViews !== null && (
        <>
          <EmailDivider />
          <Text
            style={{
              color: "#666",
              fontSize: "12px",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              margin: "0 0 12px",
            }}
          >
            Website
          </Text>
          <Text style={{ color: "#C9A84C", fontSize: "32px", fontWeight: 600, margin: "0 0 4px" }}>
            {weeklyViews.toLocaleString()}
          </Text>
          <Text style={{ color: "#666", fontSize: "13px", margin: "0 0 4px" }}>
            visitors this week
          </Text>
          {viewsChange !== null && (
            <Text
              style={{
                color: viewsChange >= 0 ? "#4DA86E" : "#D94F4F",
                fontSize: "13px",
                margin: 0,
              }}
            >
              {viewsChange >= 0 ? "+" : ""}
              {viewsChange}% vs last week
            </Text>
          )}
        </>
      )}

      <EmailDivider />
      <Text
        style={{
          color: "#666",
          fontSize: "12px",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          margin: "0 0 12px",
        }}
      >
        This week
      </Text>
      <EmailHighlight label="Posts scheduled" value={`${postsScheduledThisWeek} posts`} />
      {imageLimit !== null && (
        <EmailHighlight label="Images used" value={`${imagesUsed} of ${imageLimit} this month`} />
      )}

      <EmailDivider />
      <EmailButton href={dashboardUrl}>Open my dashboard</EmailButton>
    </BaseEmailLayout>
  );
}

export default WeeklyDigestEmail;
