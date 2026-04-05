import { NextRequest } from "next/server";
import { withErrorHandler } from "@/utils/routeHandler";
import { successResponse } from "@/lib/response";
import { requireAuth } from "@/middleware/withAuth";
import { withAuth } from "@/middleware/withAuth";
import { adminOnly } from "@/middleware/withRole";
import { userService } from "@/services/user.service";
import { RouteContext } from "@/types";


// GET /api/v1/users/:id
// Admin can fetch any user; viewer/analyst can only fetch themselves
export const GET = withErrorHandler(
  withAuth(async (req: NextRequest, ctx?: RouteContext) => {
    const { userId, role } = requireAuth(req);
    const { id } = await ctx!.params;

    const user = await userService.getUserById(id, userId, role);
    return successResponse(user, "User fetched successfully");
  })
);

// DELETE /api/v1/users/:id — admin only
export const DELETE = withErrorHandler(
  adminOnly(async (req: NextRequest, ctx?: RouteContext) => {
    const { userId } = requireAuth(req);
    const { id } = await ctx!.params;

    await userService.deleteUser(id, userId);
    return successResponse(null, "User deleted successfully");
  })
);