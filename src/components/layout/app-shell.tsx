"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Menu, Settings, UserRound } from "lucide-react";
import { Logo } from "@/components/brand";
import { Avatar } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTitle, SheetContent } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils/cn";
import { logoutAction } from "@/server/auth-actions";
import { CommandPalette, SearchTrigger } from "./command-palette";
import { PRIMARY_NAV, SECONDARY_NAV, type NavItem } from "./nav-items";

export interface ShellProps {
  user: { name: string | null; email: string };
  organizationName: string;
  badges: { followUpsDue: number };
  children: React.ReactNode;
}

function NavLink({
  item,
  badge,
  onNavigate,
}: {
  item: NavItem;
  badge?: number;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex h-8 items-center gap-2.5 rounded-md px-2.5 text-sm font-medium transition-colors",
        active
          ? "bg-background text-foreground shadow-xs ring-1 ring-border"
          : "text-muted-foreground hover:bg-accent hover:text-foreground"
      )}
    >
      <Icon
        aria-hidden
        className={cn(
          "size-4 shrink-0 transition-colors",
          active ? "text-primary" : "text-subtle group-hover:text-muted-foreground"
        )}
      />
      <span className="flex-1 truncate">{item.label}</span>
      {badge ? (
        <span className="tabular rounded-full bg-warning-soft px-1.5 text-2xs font-semibold text-warning">
          {badge}
          <span className="sr-only"> due</span>
        </span>
      ) : null}
    </Link>
  );
}

function UserMenu({ user, organizationName }: Pick<ShellProps, "user" | "organizationName">) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex w-full items-center gap-2.5 rounded-md p-1.5 text-left transition-colors hover:bg-accent data-[state=open]:bg-accent">
          <Avatar name={user.name ?? user.email} size="sm" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-foreground">
              {user.name ?? user.email}
            </span>
            <span className="block truncate text-xs text-muted-foreground">{organizationName}</span>
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="w-56">
        <DropdownMenuLabel className="truncate">{user.email}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings?tab=account">
            <UserRound /> Account
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <Settings /> Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void logoutAction()}>
          <LogOut /> Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SidebarContent({
  user,
  organizationName,
  badges,
  onNavigate,
}: Omit<ShellProps, "children"> & { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center px-4">
        <Logo href="/dashboard" />
      </div>
      <div className="px-3 pb-2">
        <SearchTrigger />
      </div>
      <nav aria-label="Main" className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2">
        {PRIMARY_NAV.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            badge={item.badgeKey ? badges[item.badgeKey] : undefined}
            onNavigate={onNavigate}
          />
        ))}
      </nav>
      <div className="space-y-0.5 px-3 pb-2">
        {SECONDARY_NAV.map((item) => (
          <NavLink key={item.href} item={item} onNavigate={onNavigate} />
        ))}
      </div>
      <div className="border-t border-sidebar-border p-2">
        <UserMenu user={user} organizationName={organizationName} />
      </div>
    </div>
  );
}

export function AppShell({ children, ...props }: ShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => setMobileOpen(false), [pathname]);

  return (
    <div className="min-h-dvh bg-background print:min-h-0">
      <a
        href="#main"
        className="no-print sr-only z-50 rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
      >
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-60 border-r border-sidebar-border bg-sidebar lg:block">
        <SidebarContent {...props} />
      </aside>

      {/* Mobile top bar */}
      <header className="no-print sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/90 px-3 backdrop-blur lg:hidden">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileOpen(true)}
          aria-label="Open navigation"
        >
          <Menu />
        </Button>
        <Logo href="/dashboard" />
        <div className="ml-auto">
          <SearchTrigger compact />
        </div>
      </header>

      <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[18rem] bg-sidebar p-0" aria-describedby={undefined}>
          <DialogTitle className="sr-only">Navigation</DialogTitle>
          <SidebarContent {...props} onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Dialog>

      <CommandPalette />

      <main id="main" className="lg:pl-60 print:pl-0">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10 print:max-w-none print:p-0">
          {children}
        </div>
      </main>
    </div>
  );
}
