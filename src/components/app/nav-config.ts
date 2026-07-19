import {
  Home,
  Globe,
  PenLine,
  Users,
  Settings,
  BarChart3,
  HelpCircle,
  CalendarCheck,
  Bell,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

/** Top-level primary nav (no section label) */
export const PRIMARY_NAV: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: Home },
];

/** Core product areas */
export const WORKSPACE_NAV: NavItem[] = [
  { href: "/website", label: "Website", icon: Globe },
  { href: "/content", label: "Content", icon: PenLine },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/plan", label: "Plan", icon: CalendarCheck },
];

/** Marketplace — single item, no section label */
export const MARKETPLACE_NAV: NavItem[] = [
  { href: "/agencies", label: "Agency Marketplace", icon: Users },
];

/** Utility nav — Notifications sits where Settings previously led the list */
export const UTILITY_NAV: NavItem[] = [
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/help", label: "Help", icon: HelpCircle },
];

/** Mobile drawer uses the same utility list */
export const DRAWER_UTILITY_NAV: NavItem[] = UTILITY_NAV;

/** Mobile bottom tabs — Home + Workspace */
export const BOTTOM_TABS: NavItem[] = [...PRIMARY_NAV, ...WORKSPACE_NAV];
