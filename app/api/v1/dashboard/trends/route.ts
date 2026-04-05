import { NextRequest } from "next/server";
import { withErrorHandler } from "@/utils/routeHandler";
import { successResponse } from "@/lib/response";
import { requireAuth } from "@/middleware/withAuth";
import { analystOrAbove } from "@/middleware/withRole";
import { parseQuery } from "@/utils/validate";
import { dashboardQuerySchema } from "@/schemas/record.schema";
import { dashboardService } from "@/services/dashboard.service";

// GET /api/v1/dashboard/trends
// Optional query params: months=6, startDate, endDate
export const GET = withErrorHandler(
  analystOrAbove(async (req: NextRequest) => {
    const user = requireAuth(req);
    const query = parseQuery(dashboardQuerySchema, req.nextUrl.searchParams);

    const trends = await dashboardService.getMonthlyTrends(user, query);
    return successResponse(trends, "Monthly trends fetched successfully");
  })
);