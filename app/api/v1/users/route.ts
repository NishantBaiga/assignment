import { NextRequest } from "next/server";
import { withErrorHandler } from "@/utils/routeHandler";
import { successResponse } from "@/lib/response";
import { parseQuery } from "@/utils/validate";
import { listUsersQuerySchema } from "@/schemas/user.schema";
import { userService } from "@/services/user.service";
import { adminOnly } from "@/middleware/withRole";

// GET /api/v1/users — admin only
export const GET = withErrorHandler(
  adminOnly(async (req: NextRequest) => {
    const query = parseQuery(listUsersQuerySchema, req.nextUrl.searchParams);
    const result = await userService.listUsers(query);

    return successResponse(result, "Users fetched successfully");
  })
);