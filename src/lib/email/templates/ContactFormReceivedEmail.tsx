import {
  Text,
} from "@react-email/components";
import {
  BaseEmailLayout,
  EmailHeading,
  EmailBody,
  EmailButton,
  EmailDivider,
  EmailHighlight,
} from "./BaseEmailLayout";

export interface ContactFormReceivedEmailProps {
  ownerName: string;
  ownerBusinessName: string;
  senderName: string;
  senderEmail: string;
  message: string;
  serviceInterest: string | null;
}

export function ContactFormReceivedEmail({
  ownerName,
  ownerBusinessName,
  senderName,
  senderEmail,
  message,
  serviceInterest,
}: ContactFormReceivedEmailProps) {
  return (
    <BaseEmailLayout preview={`New enquiry for ${ownerBusinessName} from ${senderName}`}>
      <EmailHeading>New enquiry on your website.</EmailHeading>
      <EmailBody>
        {`Someone reached out through your ${ownerBusinessName} website. Here are the details:`}
      </EmailBody>
      <EmailDivider />
      <EmailHighlight label="From" value={senderName} />
      <EmailHighlight label="Email" value={senderEmail} />
      {serviceInterest && (
        <EmailHighlight label="Service interest" value={serviceInterest} />
      )}
      <EmailDivider />
      <Text style={{ color: "#A0A0A0", fontSize: "13px", marginBottom: "4px" }}>
        Message:
      </Text>
      <Text
        style={{
          color: "#F0EDE8",
          fontSize: "14px",
          lineHeight: "1.6",
          backgroundColor: "#1A1A1C",
          padding: "16px",
          borderRadius: "8px",
          margin: "0 0 24px",
        }}
      >
        {message}
      </Text>
      <EmailButton href={`mailto:${senderEmail}`}>Reply to {senderName}</EmailButton>
      <EmailBody>{`You can also view all your enquiries from your Zuri dashboard.`}</EmailBody>
    </BaseEmailLayout>
  );
}

export default ContactFormReceivedEmail;
