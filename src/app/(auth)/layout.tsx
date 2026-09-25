import { BellRing, FileText, Sparkles } from "lucide-react";
import { Logo } from "@/components/brand";

const POINTS = [
  {
    icon: Sparkles,
    title: "Reply in seconds",
    body: "AI drafts a clear, professional response to every enquiry.",
  },
  {
    icon: FileText,
    title: "Quote with confidence",
    body: "Build polished quotations with totals calculated for you.",
  },
  {
    icon: BellRing,
    title: "Never miss a follow-up",
    body: "Know exactly who needs your attention today.",
  },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_minmax(0,0.9fr)]">
      <div className="flex flex-col px-6 py-8 sm:px-10">
        <Logo />
        <main className="flex flex-1 items-center justify-center py-12">
          <div className="w-full max-w-[380px] animate-fade-up">{children}</div>
        </main>
        <p className="text-xs text-subtle">© {new Date().getFullYear()} AI Sales Manager</p>
      </div>

      <aside className="relative hidden overflow-hidden border-l bg-canvas lg:flex lg:flex-col lg:justify-center lg:px-14">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.55] [background-image:linear-gradient(hsl(var(--border))_1px,transparent_1px),linear-gradient(90deg,hsl(var(--border))_1px,transparent_1px)] [background-size:44px_44px] [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_75%)]"
        />
        <div className="relative max-w-md">
          <p className="text-sm font-medium text-primary">Built for Malaysian SMEs</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
            Never lose a customer because you forgot to follow up.
          </h2>
          <ul className="mt-10 space-y-6">
            {POINTS.map(({ icon: Icon, title, body }) => (
              <li key={title} className="flex gap-4">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-background text-primary shadow-xs">
                  <Icon className="size-4" aria-hidden />
                </span>
                <div>
                  <p className="font-medium text-foreground">{title}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}
