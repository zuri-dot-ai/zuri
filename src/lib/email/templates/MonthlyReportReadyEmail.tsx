// TODO: copywriting — stub only, doc §2.5
import { BaseEmailLayout, EmailHeading, EmailBody, EmailButton } from "./BaseEmailLayout";

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
      <EmailHeading>Your monthly report is ready.</EmailHeading>
      <EmailBody>{`Hi ${firstName}, your ${monthName} performance report is ready to view.`}</EmailBody>
      <EmailButton href={reportUrl}>View my report</EmailButton>
    </BaseEmailLayout>
  );
}

export default MonthlyReportReadyEmail;
