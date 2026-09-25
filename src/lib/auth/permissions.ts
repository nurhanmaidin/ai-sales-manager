import type { OrgRole } from "@prisma/client";

export function canManageOrganization(role: OrgRole) {
  return role === "OWNER" || role === "ADMIN";
}
