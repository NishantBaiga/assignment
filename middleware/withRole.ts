import { NextRequest, NextResponse } from "next/server";
import { withAuth, requireAuth } from "./withAuth";
import { AppError } from "@/utils/AppError";
import { errorResponse } from "@/lib/response";
import { UserRole, RouteContext } from "@/types";

// ---------------------------------------------------------------------------
// Role hierarchy — higher index = more permissions
// Used for "at least X role" checks
// ---------------------------------------------------------------------------
const ROLE_HIERARCHY: Record<UserRole, number> = {
  viewer: 0,
  analyst: 1,
  admin: 2,
};



type AuthenticatedHandler = (
  req: NextRequest,
  ctx?: RouteContext
) => Promise<NextResponse>;

// ---------------------------------------------------------------------------
// withRole — restricts handler to specific roles
// Usage: withRole(["admin", "analyst"])(handler)
// ---------------------------------------------------------------------------
export function withRole(allowedRoles: UserRole[]) {
  return function (handler: AuthenticatedHandler): AuthenticatedHandler {
    // First verify JWT, then check role
    return withAuth(async (req: NextRequest, ctx?: RouteContext) => {
      try {
        const user = requireAuth(req);

        if (!allowedRoles.includes(user.role)) {
          throw AppError.forbidden(
            `This action requires one of the following roles: ${allowedRoles.join(", ")}`
          );
        }

        return await handler(req, ctx);
      } catch (error) {
        return errorResponse(error);
      }
    });
  };
}

// ---------------------------------------------------------------------------
// withMinRole — restricts handler to a minimum role level
// Usage: withMinRole("analyst")(handler) — allows analyst + admin
// ---------------------------------------------------------------------------
export function withMinRole(minimumRole: UserRole) {
  return function (handler: AuthenticatedHandler): AuthenticatedHandler {
    return withAuth(async (req: NextRequest, ctx?: RouteContext) => {
      try {
        const user = requireAuth(req);
        const userLevel = ROLE_HIERARCHY[user.role];
        const requiredLevel = ROLE_HIERARCHY[minimumRole];

        if (userLevel < requiredLevel) {
          throw AppError.forbidden(
            `This action requires at least the '${minimumRole}' role`
          );
        }

        return await handler(req, ctx);
      } catch (error) {
        return errorResponse(error);
      }
    });
  };
}

// ---------------------------------------------------------------------------
// Convenience exports — pre-built role guards
// ---------------------------------------------------------------------------
export const adminOnly = withRole(["admin"]);
export const analystOrAbove = withMinRole("analyst");
export const allRoles = withMinRole("viewer");