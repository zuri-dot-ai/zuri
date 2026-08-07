// src/lib/email/templates/MonthlyReportReadyEmail.tsx

import {
  BaseEmailLayout,
  EmailEyebrow,
  EmailHeading,
  EmailBody,
  EmailButton,
} from "./BaseEmailLayout";

export interface MonthlyReportReadyEmailProps {
  firstName: string;
  monthName: string;
  reportUrl: string;
}

export function MonthlyReportReadyEmail({
  firstName,
  monthName,
  reportUrl,
}: MonthlyReportReadyEmailProps) {
  return (
    <BaseEmailLayout preview={`Your ${monthName} performance report is ready`}>
      <EmailEyebrow>Report Ready</EmailEyebrow>
      <EmailHeading>{`Your ${monthName} report is in, ${firstName}.`}</EmailHeading>
      <EmailBody>
        {`A full look at how your website and content performed in ${monthName} — traffic, engagement, and where your growth is coming from.`}
      </EmailBody>
      <EmailButton href={reportUrl}>View my report</EmailButton>
    </BaseEmailLayout>
  );
}

export default MonthlyReportReadyEmail;
