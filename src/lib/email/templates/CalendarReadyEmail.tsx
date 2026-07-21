// TODO: copywriting — stub only, doc §2.4
import { BaseEmailLayout, EmailHeading, EmailBody, EmailButton } from "./BaseEmailLayout";

export interface CalendarReadyEmailProps {
  firstName: string;
  calendarUrl: string;
}

export function CalendarReadyEmail({ firstName, calendarUrl }: CalendarReadyEmailProps) {
  return (
    <BaseEmailLayout preview="Your content calendar is ready">
      <EmailHeading>Your content calendar is ready.</EmailHeading>
      <EmailBody>{`Hi ${firstName}, your monthly content calendar has been generated.`}</EmailBody>
      <EmailButton href={calendarUrl}>View my calendar</EmailButton>
    </BaseEmailLayout>
  );
}

export default CalendarReadyEmail;
