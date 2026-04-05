import { NextRequest } from "next/server";
import { withErrorHandler } from "@/utils/routeHandler";
import { successResponse } from "@/lib/response";
import { requireAuth } from "@/middleware/withAuth";
import { allRoles } from "@/middleware/withRole";
import { dashboardService } from "@/services/dashboard.service";

// GET /api/v1/dashboard/recent?limit=10
// All roles can see recent transactions
export const GET = withErrorHandler(
  allRoles(async (req: NextRequest) => {
    const user = requireAuth(req);

    const limitParam = req.nextUrl.searchParams.get("limit");
    const limit = limitParam ? Math.max(1, parseInt(limitParam, 10)) : 10;

    const recent = await dashboardService.getRecentTransactions(user, limit);
    return successResponse(recent, "Recent transactions fetched successfully");
  })
);