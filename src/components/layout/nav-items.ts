import {
  BellRing,
  FileText,
  LayoutDashboard,
  Settings,
  Sparkles,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  badgeKey?: "followUpsDue";
}

export const PRIMARY_NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/customers", label: "Customers", icon: UserRound },
  { href: "/quotations", label: "Quotations", icon: FileText },
  { href: "/followups", label: "Follow-ups", icon: BellRing, badgeKey: "followUpsDue" },
  { href: "/ai-assistant", label: "AI Assistant", icon: Sparkles },
];

export const SECONDARY_NAV: NavItem[] = [{ href: "/settings", label: "Settings", icon: Settings }];
