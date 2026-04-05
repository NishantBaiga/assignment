import { z } from "zod";
import { UserRole, UserStatus } from "@/types";

// ---------------------------------------------------------------------------
// Zod v4: z.enum() params only accept 'error' or 'message', not
// 'required_error' / 'invalid_type_error'
// ---------------------------------------------------------------------------
const roleField = z.enum(["viewer", "analyst", "admin"] as const, {
  error: "Role must be viewer, analyst, or admin",
});

const statusField = z.enum(["active", "inactive"] as const, {
  error: "Status must be active or inactive",
});

// ---------------------------------------------------------------------------
// Update role
// ---------------------------------------------------------------------------
export const updateRoleSchema = z.object({
  role: roleField,
});

export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;

// ---------------------------------------------------------------------------
// Update status
// ---------------------------------------------------------------------------
export const updateStatusSchema = z.object({
  status: statusField,
});

export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;

// ---------------------------------------------------------------------------
// List users query params
// ---------------------------------------------------------------------------
export const listUsersQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1))
    .pipe(z.number().min(1, "Page must be at least 1")),

  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 10))
    .pipe(z.number().min(1).max(100, "Limit cannot exceed 100")),

  role: roleField.optional(),
  status: statusField.optional(),
  search: z.string().trim().optional(),
});

export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;