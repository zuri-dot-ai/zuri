import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sanitizeText, sanitizeUrl } from "@/lib/utils/sanitize";
import { sendEmail } from "@/lib/email/resend";
import { errorResponse } from "@/lib/security/sanitize-response";
import {
  checkRateLimit,
  rateLimitExceededResponse,
} from "@/lib/security/rate-limit";
import {
  getClientIp,
  hashForRateLimit,
} from "@/lib/onboarding/anonymous-session";
import {
  clearCustomSiteSessionCookie,
  convertCustomSiteSession,
} from "@/lib/custom-site/anonymous-session";
import { createNotificationAsync } from "@/lib/notifications/create-notification";
import {
  BUDGET_RANGE_LABELS,
  FEATURE_LABELS,
  isCustomSiteBudgetRange,
  isCustomSiteFeature,
  isCustomSiteProjectType,
  isCustomSiteTimeline,
  PROJECT_TYPE_LABELS,
  TIMELINE_LABELS,
  type CustomSiteFeature,
  type CustomSiteFormState,
  type CustomSiteProjectType,
  type CustomSiteTimeline,
} from "@/lib/custom-site/types";

function formFromSession(
  data: Record<string, unknown>
): Partial<CustomSiteFormState> {
  return {
    projectType:
      typeof data.projectType === "string" &&
      isCustomSiteProjectType(data.projectType)
        ? data.projectType
        : "",
    description:
      typeof data.description === "string" ? data.description : "",
    features: Array.isArray(data.features)
      ? data.features.filter(
          (v): v is CustomSiteFeature =>
            typeof v === "string" && isCustomSiteFeature(v)
        )
      : [],
    customIntegrationsText:
      typeof data.customIntegrationsText === "string"
        ? data.customIntegrationsText
        : "",
    otherFeaturesText:
      typeof data.otherFeaturesText === "string"
        ? data.otherFeaturesText
        : "",
    budgetRange:
      typeof data.budgetRange === "string" &&
      isCustomSiteBudgetRange(data.budgetRange)
        ? data.budgetRange
        : "",
    timeline:
      typeof data.timeline === "string" && isCustomSiteTimeline(data.timeline)
        ? data.timeline
        : "",
    referenceUrl:
      typeof data.referenceUrl === "string" ? data.referenceUrl : "",
  };
}

/**
 * POST /api/custom-site/submit
 * Auth required. Creates custom_site_requests from the anon session (source of truth),
 * marks onboarding complete without starting AI generation, notifies admins.
 */
export async function POST(req: Request) {
  const supabaseAuth = await createClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { sessionToken?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const sessionToken =
    typeof body.sessionToken === "string" ? body.sessionToken : "";
  if (!sessionToken) {
    return NextResponse.json({ error: "Missing sessionToken" }, { status: 400 });
  }

  const supabase = createServiceClient();

  const ip = getClientIp(req.headers);
  const rateKey = hashForRateLimit(ip ?? user.id);
  const rate = await checkRateLimit(supabase, rateKey, "custom_site:submit");
  if (!rate.allowed) {
    return rateLimitExceededResponse(rate.resetIn);
  }

  const { data: openRequest } = await supabase
    .from("custom_site_requests")
    .select("id, status")
    .eq("user_id", user.id)
    .in("status", ["pending", "in_review", "approved"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (openRequest) {
    return errorResponse(
      409,
      "You already have a custom project request in progress. Check your dashboard for status."
    );
  }

  const { data: session, error: sessionError } = await supabase
    .from("anonymous_custom_site_sessions")
    .select("data, expires_at")
    .eq("session_token", sessionToken)
    .maybeSingle();

  if (sessionError || !session) {
    return errorResponse(404, "Session not found or expired.");
  }
  if (new Date(session.expires_at).getTime() < Date.now()) {
    return errorResponse(410, "Session expired. Please start again.");
  }

  const form = formFromSession(session.data as Record<string, unknown>);
  const errors: string[] = [];

  if (!form.projectType || !isCustomSiteProjectType(form.projectType)) {
    errors.push("Project type is required");
  }

  const description = sanitizeText(form.description ?? "");
  if (!description || description.length < 10) {
    errors.push("Please describe your project (at least 10 characters)");
  }
  if (description.length > 2000) {
    errors.push("Description is too long");
  }

  const features = (form.features ?? []).filter(isCustomSiteFeature);
  if (features.length === 0) {
    errors.push("Select at least one feature");
  }

  const customIntegrationsText = features.includes("custom-integrations")
    ? sanitizeText(form.customIntegrationsText ?? "").slice(0, 1000)
    : null;
  if (features.includes("custom-integrations") && !customIntegrationsText) {
    errors.push("Please describe the custom integrations you need");
  }

  const otherFeaturesText = features.includes("other")
    ? sanitizeText(form.otherFeaturesText ?? "").slice(0, 1000)
    : null;
  if (features.includes("other") && !otherFeaturesText) {
    errors.push("Please describe the other features you need");
  }

  if (!form.timeline || !isCustomSiteTimeline(form.timeline)) {
    errors.push("Timeline is required");
  }

  let budgetRange: string | null = null;
  if (form.budgetRange) {
    if (!isCustomSiteBudgetRange(form.budgetRange)) {
      errors.push("Invalid budget range");
    } else {
      budgetRange = form.budgetRange;
    }
  }

  let referenceUrl: string | null = null;
  if (form.referenceUrl?.trim()) {
    referenceUrl = sanitizeUrl(form.referenceUrl.trim());
    if (!referenceUrl) {
      errors.push("Reference link looks invalid");
    }
  }

  if (errors.length > 0) {
    return NextResponse.json(
      { error: errors[0], details: errors },
      { status: 400 }
    );
  }

  try {
    await convertCustomSiteSession(sessionToken, user.id);
  } catch {
    // Non-fatal if already converted
  }

  const projectType = form.projectType as CustomSiteProjectType;
  const timeline = form.timeline as CustomSiteTimeline;

  const { data: inserted, error: insertError } = await supabase
    .from("custom_site_requests")
    .insert({
      user_id: user.id,
      project_type: projectType,
      description,
      features,
      custom_integrations_text: customIntegrationsText,
      other_features_text: otherFeaturesText,
      budget_range: budgetRange,
      timeline,
      reference_url: referenceUrl,
      status: "pending",
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    return errorResponse(
      500,
      "Could not submit your request. Please try again.",
      insertError?.message
    );
  }

  // Mark onboarding complete without starting AI website generation.
  await supabase
    .from("profiles")
    .update({
      onboarding_completed: true,
      onboarding_completed_at: new Date().toISOString(),
    })
    .eq("id", user.id)
    .eq("onboarding_completed", false);

  await clearCustomSiteSessionCookie();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", user.id)
    .maybeSingle();

  const firstName =
    (profile?.full_name ?? "").trim().split(/\s+/)[0] || "there";
  const userEmail = profile?.email || user.email || "";
  const projectTypeLabel = PROJECT_TYPE_LABELS[projectType];
  const featuresLabel = features.map((f) => FEATURE_LABELS[f]).join(", ");
  const timelineLabel = TIMELINE_LABELS[timeline];
  const budgetLabel = budgetRange
    ? BUDGET_RANGE_LABELS[budgetRange as keyof typeof BUDGET_RANGE_LABELS]
    : undefined;

  const appUrl = (
    process.env.NEXT_PUBLIC_APP_URL || "https://app.buildzuri.com"
  ).replace(/\/$/, "");
  const adminUrl = `${appUrl}/admin/custom-site-requests`;

  void (async () => {
    try {
      if (userEmail) {
        await sendEmail({
          to: userEmail,
          subject: "We received your custom site request",
          template: "custom_site_request_confirmation",
          templateProps: { firstName, projectTypeLabel },
        });
      }
    } catch (err) {
      console.error("[custom-site/submit] confirmation email failed:", err);
    }

    try {
      const zuriTeamEmail =
        process.env.ZURI_TEAM_EMAIL || "team@buildzuri.com";
      await sendEmail({
        to: zuriTeamEmail,
        subject: `New custom site request: ${projectTypeLabel}`,
        template: "new_custom_site_request_alert",
        templateProps: {
          projectTypeLabel,
          userName: profile?.full_name || firstName,
          userEmail,
          description,
          features: featuresLabel,
          timeline: timelineLabel,
          budgetRange: budgetLabel,
          adminUrl,
        },
      });
    } catch (err) {
      console.error("[custom-site/submit] admin email failed:", err);
    }

    try {
      const { data: admins } = await supabase
        .from("profiles")
        .select("id")
        .eq("is_admin", true);

      for (const admin of admins ?? []) {
        createNotificationAsync({
          userId: admin.id,
          type: "custom_site_request_received",
          title: "New custom site request",
          body: `${profile?.full_name || firstName} requested a ${projectTypeLabel}.`,
          actionUrl: "/admin/custom-site-requests",
          actionLabel: "Review request",
          metadata: {
            request_id: inserted.id,
            project_type: projectType,
            email: userEmail,
          },
        });
      }
    } catch (err) {
      console.error("[custom-site/submit] admin notifications failed:", err);
    }
  })();

  return NextResponse.json({
    success: true,
    requestId: inserted.id,
    message:
      "Your custom project request has been submitted. We'll be in touch soon.",
  });
}
