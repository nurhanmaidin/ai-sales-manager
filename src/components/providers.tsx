"use client";

import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/overlays";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider delayDuration={300}>
      {children}
      <Toaster
        position="bottom-right"
        gap={8}
        toastOptions={{
          classNames: {
            toast:
              "!rounded-lg !border !border-border !bg-background !text-foreground !shadow-popover !font-sans !text-sm !gap-2.5",
            description: "!text-muted-foreground",
            success: "[&_[data-icon]]:!text-success",
            error: "[&_[data-icon]]:!text-destructive",
            actionButton: "!bg-primary !text-primary-foreground !rounded-md",
          },
        }}
      />
    </TooltipProvider>
  );
}
