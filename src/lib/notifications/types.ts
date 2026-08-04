/**
 * Zuri Notification System — Core Types
 *
 * Priority tiers (highest wins, lower numbers = higher priority):
 *  1. Critical account alerts (payment failed, account suspended)
 *  2. Blocking upgrade prompts (triggered by a blocked action)
 *  3. What's New changelog modal
 *  4. Onboarding coachmarks
 *  5. Feature callouts / marketing nudges
 *
 * Rules enforced by the queue (see notification-queue.ts):
 *  - Only one modal-class item visible at a time.
 *  - Max one "interruption" (modal or coachmark) per session.
 *  - Toasts are exempt — they never queue against modals.
 *  - Corner cards are exempt from the "one interruption" rule but only
 *    one corner card shows at a time (highest priority wins).
 */

export type NotificationPriority = 1 | 2 | 3 | 4 | 5;

export type NotificationSurface = "modal" | "coachmark" | "corner-card" | "toast";

export interface BaseNotification {
  /** Stable unique id — used for dedup and dismissal tracking. */
  id: string;
  priority: NotificationPriority;
  surface: NotificationSurface;
  /**
   * Whether this counts against the "one interruption per session" budget.
   * Modals and coachmarks are interruptions. Corner cards and toasts are not.
   */
  isInterruption: boolean;
  /** Optional: called when the item is dismissed by the user. */
  onDismiss?: () => void;
}

export interface ModalNotification extends BaseNotification {
  surface: "modal";
  isInterruption: true;
  render: () => React.ReactNode;
}

export interface CoachmarkNotification extends BaseNotification {
  surface: "coachmark";
  isInterruption: true;
  targetSelector: string;
  title: string;
  body: string;
  step: number;
  totalSteps: number;
}

export interface CornerCardNotification extends BaseNotification {
  surface: "corner-card";
  isInterruption: false;
  variant: "warning" | "error" | "info";
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
}

export type QueueableNotification =
  | ModalNotification
  | CoachmarkNotification
  | CornerCardNotification;