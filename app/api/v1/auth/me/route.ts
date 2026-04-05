import { NextRequest } from "next/server";
import { withAuth, requireAuth } from "@/middleware/withAuth";
import { withErrorHandler } from "@/utils/routeHandler";
import { successResponse } from "@/lib/response";
import { authService } from "@/services/auth.service";

export const GET = withErrorHandler(
  withAuth(async (req: NextRequest) => {
    const { userId } = requireAuth(req);
    const user = await authService.getMe(userId);
    return successResponse(user, "User fetched successfully");
  })
);