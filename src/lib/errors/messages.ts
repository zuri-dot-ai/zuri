export const ERROR_MESSAGES = {
  // Auth
  AUTH_REQUIRED: "You'll need to sign in to access this.",
  SESSION_EXPIRED: "Your session has expired. Please sign in again.",
  ACCOUNT_NOT_FOUND: "We couldn't find an account with that email.",
  INVALID_CREDENTIALS: "The email or password you entered is incorrect.",
  EMAIL_NOT_VERIFIED:
    "Please verify your email address before continuing. Check your inbox.",

  // Validation
  FIELD_REQUIRED: (field: string) => `${field} is required.`,
  FIELD_TOO_SHORT: (field: string, min: number) =>
    `${field} must be at least ${min} characters.`,
  FIELD_TOO_LONG: (field: string, max: number) =>
    `${field} must be ${max} characters or fewer.`,
  FIELD_INVALID_FORMAT: (field: string) =>
    `${field} contains invalid characters.`,
  FIELD_EMOJI_ONLY: (field: string) =>
    `${field} must contain at least one letter or number.`,
  FIELD_PLACEHOLDER: (field: string) =>
    `${field} still has placeholder text. Please update it.`,

  // Handle
  HANDLE_TAKEN: (suggestions: string[]) =>
    `That handle is taken. Try: ${suggestions.join(", ")}`,
  HANDLE_RESERVED: "That handle is reserved. Please choose a different one.",
  HANDLE_LOCKED:
    "Your handle is permanent once your website is published. Unpublish to change it.",
  HANDLE_INVALID:
    "Handles can only contain lowercase letters, numbers, and hyphens.",

  // Plans and Features
  UPGRADE_REQUIRED: (feature: string, plan: string) =>
    `${feature} is available on the ${plan} plan.`,
  PLAN_LIMIT_REACHED: (resource: string, reset: string) =>
    `You've used all your ${resource} this month. Your allowance resets on ${reset}.`,
  PLAN_LIMIT_WARNING: (resource: string, used: number, limit: number) =>
    `You've used ${used} of ${limit} ${resource} this month.`,
  TRIAL_ENDED: "Your free trial has ended. Upgrade to continue.",
  GRACE_PERIOD: (date: string) =>
    `Your payment failed. Update your payment method by ${date} to keep your access.`,
  SUSPENDED:
    "Your account has been suspended due to a payment issue. Resubscribe to restore access.",

  // Website Builder
  WEBSITE_NOT_FOUND:
    "No website found. Generate your website from the dashboard.",
  WEBSITE_GENERATION_FAILED:
    "Website generation failed. Please try again — if this keeps happening, contact support.",
  WEBSITE_GENERATION_TIMEOUT:
    "Your website is taking longer than usual to generate. We'll notify you when it's ready.",
  PUBLISH_VALIDATION_FAILED:
    "Your website has some issues that need fixing before it can go live.",
  CUSTOM_DOMAIN_TAKEN:
    "This domain is already connected to another Zuri site.",
  CUSTOM_DOMAIN_INVALID:
    "Please enter a valid domain name (e.g. mybusiness.com).",
  CUSTOM_DOMAIN_ZURI: "You can't use a zuri.com address as a custom domain.",
  DNS_PROPAGATING:
    "Your domain DNS is still propagating. This can take up to 48 hours.",
  DNS_FAILED:
    "DNS verification failed. Please check your DNS settings and try again.",

  // Content
  CALENDAR_GENERATION_FAILED:
    "We couldn't generate your calendar. Try again — your previous calendar is still intact.",
  CONTENT_GENERATION_FAILED:
    "Content generation didn't complete. Please try again.",
  IMAGE_GENERATION_FAILED:
    "Image generation is temporarily unavailable. You can upload or search for an image manually.",
  IMAGE_SAFETY_BLOCKED:
    "We adjusted your image to meet content guidelines and tried again.",
  BLOG_GENERATION_FAILED: "Blog post generation failed. Please try again.",
  NEWSLETTER_GENERATION_FAILED:
    "Newsletter generation failed. Please try again.",
  VIDEO_COMING_SOON:
    "Video generation is coming soon. Your script is ready for when it launches.",

  // File Upload
  FILE_TOO_LARGE: "The file must be smaller than 10MB.",
  FILE_WRONG_TYPE: "Only JPEG, PNG, and WebP images are allowed.",
  FILE_CORRUPTED:
    "This file appears to be corrupted. Please try a different image.",
  FILE_EMPTY: "The file you selected is empty.",

  // Agency
  AGENCY_INQUIRY_RATE_LIMIT:
    "You've already sent 3 inquiries to this agency recently. Please wait for their response.",
  AGENCY_NOT_FOUND: "This agency is no longer available on Zuri.",
  AGENCY_CONTACT_UPGRADE:
    "Connecting with agencies is available on the Growth plan.",

  // Payments
  PAYMENT_INITIATION_FAILED:
    "We couldn't start the payment process. Please try again.",
  PAYMENT_VERIFICATION_FAILED:
    "We couldn't verify your payment. Contact support with reference:",
  PAYMENT_CANCELLED:
    "Payment was not completed. Your plan hasn't changed.",

  // Analytics
  META_TOKEN_EXPIRED:
    "Your Instagram & Facebook connection has expired. Reconnect to restore insights.",
  SEARCH_CONSOLE_EXPIRED:
    "Your Google Search Console connection has expired. Reconnect to restore search data.",
  META_CONNECT_FAILED:
    "Connection to Meta didn't complete. Please try again.",
  SC_SITE_NOT_VERIFIED:
    "Your website isn't verified in Google Search Console yet. Follow the setup guide.",

  // General
  RATE_LIMIT:
    "You're doing that too quickly. Please wait a moment and try again.",
  NOT_FOUND: "We couldn't find what you're looking for.",
  SERVER_ERROR: "Something went wrong on our end. Please try again.",
  SERVER_ERROR_WITH_REF: (ref: string) =>
    `Something went wrong on our end. Please try again. If this continues, contact support with reference: ${ref}`,
  OFFLINE:
    "You appear to be offline. Check your connection and try again.",
  UNKNOWN:
    "An unexpected error occurred. Please refresh the page and try again.",
} as const;
