import type { ActionPlanTaskRow, Platform, TaskType } from "@/types/database";
import type { WebsiteStatus } from "@/types/website";

const PLATFORM_LABEL: Record<Platform, string> = {
  instagram: "Instagram",
  linkedin: "LinkedIn",
  facebook: "Facebook",
  tiktok: "TikTok",
  email: "email",
  twitter: "X",
  whatsapp: "WhatsApp",
};

export function greetingForNow(date = new Date()): string {
  const h = date.getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export function websiteStatusLabel(
  status: WebsiteStatus | string | null | undefined
): "Published" | "Preview" | "Suspended" | "Draft" {
  switch (status) {
    case "published":
      return "Published";
    case "suspended":
      return "Suspended";
    case "preview":
    case "generating":
      return "Preview";
    default:
      return status ? "Preview" : "Draft";
  }
}

export function isWebsiteLive(
  status: WebsiteStatus | string | null | undefined
): boolean {
  return status === "published";
}

/** Derive a one-line CTA from the 90-day action-plan task shape. */
export function actionCtaForTask(task: ActionPlanTaskRow): string {
  if (task.task_type === "content" && task.platform) {
    return `Post this to ${PLATFORM_LABEL[task.platform]}`;
  }
  const byType: Record<TaskType, string> = {
    content: "Publish this content piece",
    website: "Update your website",
    engagement: "Complete this engagement task",
    setup: "Finish this setup step",
  };
  return byType[task.task_type] ?? "Complete today's action";
}

export function formatCompactNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}
