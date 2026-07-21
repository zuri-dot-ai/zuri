// docs/08_NOTIFICATIONS.md §5.2 — template renderer + registry.

import { render } from "@react-email/render";
import { createElement, type ComponentType } from "react";

import { WelcomeEmail } from "./WelcomeEmail";
import { PasswordResetEmail } from "./PasswordResetEmail";
import { AccountDeletedEmail } from "./AccountDeletedEmail";
import { WebsiteGeneratedEmail } from "./WebsiteGeneratedEmail";
import { WebsiteGenerationFailedEmail } from "./WebsiteGenerationFailedEmail";
import { WebsitePublishedEmail } from "./WebsitePublishedEmail";
import { WebsiteSuspendedEmail } from "./WebsiteSuspendedEmail";
import { ContactFormReceivedEmail } from "./ContactFormReceivedEmail";
import { DomainConnectedEmail } from "./DomainConnectedEmail";
import { DomainDnsDelayedEmail } from "./DomainDnsDelayedEmail";
import { CalendarReadyEmail } from "./CalendarReadyEmail";
import { UsageWarningEmail } from "./UsageWarningEmail";
import { UsageLimitReachedEmail } from "./UsageLimitReachedEmail";
import { MetaTokenExpiredEmail } from "./MetaTokenExpiredEmail";
import { SearchConsoleExpiredEmail } from "./SearchConsoleExpiredEmail";
import { MonthlyReportReadyEmail } from "./MonthlyReportReadyEmail";
import { PaymentSuccessfulEmail } from "./PaymentSuccessfulEmail";
import { PaymentFailedEmail } from "./PaymentFailedEmail";
import { GracePeriodStartedEmail } from "./GracePeriodStartedEmail";
import { GracePeriodEndingEmail } from "./GracePeriodEndingEmail";
import { TrialEndingEmail } from "./TrialEndingEmail";
import { TrialExpiredEmail } from "./TrialExpiredEmail";
import { PlanUpgradedEmail } from "./PlanUpgradedEmail";
import { PlanDowngradedEmail } from "./PlanDowngradedEmail";
import { SubscriptionCancelledEmail } from "./SubscriptionCancelledEmail";
import { AgencyInquirySentEmail } from "./AgencyInquirySentEmail";
import { AgencyInquiryReceivedEmail } from "./AgencyInquiryReceivedEmail";
import { AgencyApplicationConfirmationEmail } from "./AgencyApplicationConfirmationEmail";
import { NewAgencyApplicationAlertEmail } from "./NewAgencyApplicationAlertEmail";
import { AgencyApprovalEmail } from "./AgencyApprovalEmail";
import { AgencyRejectionEmail } from "./AgencyRejectionEmail";
import { WeeklyDigestEmail } from "./WeeklyDigestEmail";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TEMPLATE_MAP: Record<string, ComponentType<any>> = {
  welcome: WelcomeEmail,
  password_reset: PasswordResetEmail,
  account_deleted: AccountDeletedEmail,
  website_generated: WebsiteGeneratedEmail,
  website_generation_failed: WebsiteGenerationFailedEmail,
  website_published: WebsitePublishedEmail,
  website_suspended: WebsiteSuspendedEmail,
  contact_form_received: ContactFormReceivedEmail,
  domain_connected: DomainConnectedEmail,
  domain_dns_delayed: DomainDnsDelayedEmail,
  calendar_ready: CalendarReadyEmail,
  usage_warning: UsageWarningEmail,
  usage_limit_reached: UsageLimitReachedEmail,
  meta_token_expired: MetaTokenExpiredEmail,
  search_console_expired: SearchConsoleExpiredEmail,
  monthly_report_ready: MonthlyReportReadyEmail,
  payment_successful: PaymentSuccessfulEmail,
  payment_failed: PaymentFailedEmail,
  grace_period_started: GracePeriodStartedEmail,
  grace_period_ending: GracePeriodEndingEmail,
  trial_ending: TrialEndingEmail,
  trial_expired: TrialExpiredEmail,
  plan_upgraded: PlanUpgradedEmail,
  plan_downgraded: PlanDowngradedEmail,
  subscription_cancelled: SubscriptionCancelledEmail,
  agency_inquiry_sent: AgencyInquirySentEmail,
  agency_inquiry_received: AgencyInquiryReceivedEmail,
  agency_application_confirmation: AgencyApplicationConfirmationEmail,
  new_agency_application_alert: NewAgencyApplicationAlertEmail,
  agency_approval: AgencyApprovalEmail,
  agency_rejection: AgencyRejectionEmail,
  weekly_digest: WeeklyDigestEmail,
};

export async function renderEmailTemplate(
  templateName: string,
  props: Record<string, unknown>
): Promise<{ html: string; text: string }> {
  const Template = TEMPLATE_MAP[templateName];
  if (!Template) throw new Error(`Unknown email template: ${templateName}`);

  const element = createElement(Template, props);
  const html = await render(element);
  const text = await render(element, { plainText: true });

  return { html, text };
}
