// src/lib/email/templates/CalendarReadyEmail.tsx

import {
  BaseEmailLayout,
  EmailEyebrow,
  EmailHeading,
  EmailBody,
  EmailButton,
} from "./BaseEmailLayout";

export interface CalendarReadyEmailProps {
  firstName: string;
  calendarUrl: string;
}

export function CalendarReadyEmail({ firstName, calendarUrl }: CalendarReadyEmailProps) {
  return (
    <BaseEmailLayout preview="Your content calendar is ready">
      <EmailEyebrow>Calendar Ready</EmailEyebrow>
      <EmailHeading>{`Your month is planned out, ${firstName}.`}</EmailHeading>
      <EmailBody>
        {`Your content calendar for the month ahead is ready — posts mapped out so you're never staring at a blank page wondering what to share next.`}
      </EmailBody>
      <EmailButton href={calendarUrl}>View my calendar</EmailButton>
    </BaseEmailLayout>
  );
}

export default CalendarReadyEmail;
