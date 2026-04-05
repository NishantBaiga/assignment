import { NextRequest } from "next/server";
import { withErrorHandler } from "@/utils/routeHandler";
import { successResponse } from "@/lib/response";
import { requireAuth } from "@/middleware/withAuth";
import { adminOnly } from "@/middleware/withRole";
import { parseBody } from "@/utils/validate";
import { updateRoleSchema } from "@/schemas/user.schema";
import { userService } from "@/services/user.service";
import { RouteContext } from "@/types";


// PATCH /api/v1/users/:id/role — admin only
export const PATCH = withErrorHandler(
  adminOnly(async (req: NextRequest, ctx?: RouteContext) => {
    const { userId } = requireAuth(req);
    const { id } = await ctx!.params;

    const body = await req.json();
    const input = parseBody(updateRoleSchema, body);

    const user = await userService.updateRole(id, input, userId);
    return successResponse(user, "User role updated successfully");
  })
);