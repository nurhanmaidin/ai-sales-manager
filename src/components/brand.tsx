import Link from "next/link";
import { cn } from "@/lib/utils/cn";

/** Original mark: a rising follow-up path that closes into a point. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden
      className={cn("size-7 shrink-0", className)}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="32" height="32" rx="8" fill="hsl(var(--primary))" />
      <path
        d="M8.5 21.5 13.5 16l3.5 3.5 6.5-8"
        stroke="white"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="23.5" cy="11.5" r="2.2" fill="hsl(154 60% 62%)" />
    </svg>
  );
}

export function Logo({
  href = "/",
  className,
  compact,
}: {
  href?: string;
  className?: string;
  compact?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn("inline-flex items-center gap-2.5 rounded-md text-foreground", className)}
      aria-label="AI Sales Manager home"
    >
      <LogoMark />
      {!compact && (
        <span className="text-md font-semibold tracking-tight">
          AI Sales <span className="text-muted-foreground">Manager</span>
        </span>
      )}
    </Link>
  );
}
