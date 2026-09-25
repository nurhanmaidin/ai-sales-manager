"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { FollowUpDialog, type FollowUpTarget } from "./followup-dialog";

export function AddFollowUpButton({
  leadId,
  customerId,
  targets,
  defaultTask,
  label = "Add follow-up",
  variant = "secondary",
  size = "sm",
  iconOnly,
}: {
  leadId?: string;
  customerId?: string;
  targets?: FollowUpTarget[];
  defaultTask?: string;
  label?: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  iconOnly?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant={variant}
        size={iconOnly ? "icon-sm" : size}
        onClick={() => setOpen(true)}
        aria-label={iconOnly ? label : undefined}
      >
        <Plus aria-hidden />
        {!iconOnly && label}
      </Button>
      <FollowUpDialog
        open={open}
        onOpenChange={setOpen}
        leadId={leadId}
        customerId={customerId}
        targets={targets}
        defaultTask={defaultTask}
      />
    </>
  );
}
