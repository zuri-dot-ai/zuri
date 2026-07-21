/**
 * Shared platform/format/status label + icon metadata for the Content
 * section. Single source so the calendar list, drawer, and campaign
 * preview never drift into slightly different labels or icon sets.
 */
import {
  Image as ImageIcon,
  Images,
  Video,
  FileText,
  BarChart3,
  MonitorPlay,
} from "lucide-react";
import {
  FaInstagram,
  FaFacebook,
  FaLinkedin,
  FaXTwitter,
  FaTiktok,
} from "react-icons/fa6";
import type { IconType } from "react-icons";

export const PLATFORM_LABELS: Record<string, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  linkedin: "LinkedIn",
  x: "X",
  tiktok: "TikTok",
};

/** Short labels for tight spaces (filter chips). */
export const PLATFORM_SHORT_LABELS: Record<string, string> = {
  instagram: "IG",
  facebook: "FB",
  linkedin: "LI",
  x: "X",
  tiktok: "TT",
};

// Real brand-colored icons — platform identity is the one place color is
// intentionally applied outside the status/pillar system, since it's a
// recognizable brand mark, not a decorative accent.
export const PLATFORM_META: Record<
  string,
  { Icon: IconType; color: string; label: string }
> = {
  instagram: { Icon: FaInstagram, color: "#E4405F", label: "Instagram" },
  facebook: { Icon: FaFacebook, color: "#1877F2", label: "Facebook" },
  linkedin: { Icon: FaLinkedin, color: "#0A66C2", label: "LinkedIn" },
  x: { Icon: FaXTwitter, color: "#E7E9EA", label: "X" },
  tiktok: { Icon: FaTiktok, color: "#25F4EE", label: "TikTok" },
};

// Format icons stay muted/grey by default — color in this system is
// reserved for status + pillar, not every visual dimension.
export const FORMAT_META: Record<string, { Icon: typeof ImageIcon; label: string }> = {
  static_image: { Icon: ImageIcon, label: "Image" },
  carousel: { Icon: Images, label: "Carousel" },
  reel: { Icon: Video, label: "Reel" },
  short_video: { Icon: Video, label: "Video" },
  video: { Icon: Video, label: "Video" },
  story: { Icon: MonitorPlay, label: "Story" },
  text_post: { Icon: FileText, label: "Text" },
  article: { Icon: FileText, label: "Article" },
  thread: { Icon: FileText, label: "Thread" },
  poll: { Icon: BarChart3, label: "Poll" },
};

export function formatMeta(formatType: string) {
  return (
    FORMAT_META[formatType] ?? {
      Icon: ImageIcon,
      label: formatType.replace(/_/g, " "),
    }
  );
}
