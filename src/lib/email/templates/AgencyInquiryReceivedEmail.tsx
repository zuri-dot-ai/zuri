import { Text } from "@react-email/components";
import {
  BaseEmailLayout,
  EmailHeading,
  EmailBody,
  EmailDivider,
  EmailHighlight,
} from "./BaseEmailLayout";

export interface AgencyInquiryReceivedEmailProps {
  agencyName: string;
  userBusinessName: string;
  userName: string;
  userEmail: string;
  userIndustry: string | null;
  userLocation: string | null;
  serviceNeeded: string | null;
  message: string;
  budget: string | null;
}

export function AgencyInquiryReceivedEmail({
  agencyName,
  userBusinessName,
  userName,
  userEmail,
  userIndustry,
  userLocation,
  serviceNeeded,
  message,
  budget,
}: AgencyInquiryReceivedEmailProps) {
  return (
    <BaseEmailLayout preview={`New client brief from ${userBusinessName} via Zuri`}>
      <EmailHeading>{`Hi ${agencyName}, you have a new enquiry.`}</EmailHeading>
      <EmailBody>
        {`A business owner on Zuri would like to work with you.`}
      </EmailBody>
      <EmailDivider />
      <EmailHighlight label="Business" value={userBusinessName} />
      <EmailHighlight label="Contact" value={userName} />
      <EmailHighlight label="Email" value={userEmail} />
      {userIndustry && <EmailHighlight label="Industry" value={userIndustry} />}
      {userLocation && <EmailHighlight label="Location" value={userLocation} />}
      {serviceNeeded && <EmailHighlight label="Service needed" value={serviceNeeded} />}
      {budget && <EmailHighlight label="Budget" value={budget} />}
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
      <EmailBody>{`Reply directly to this email to respond to ${userName}.`}</EmailBody>
    </BaseEmailLayout>
  );
}

export default AgencyInquiryReceivedEmail;
