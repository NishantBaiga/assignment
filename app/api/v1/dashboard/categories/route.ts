import { NextRequest } from "next/server";
import { withErrorHandler } from "@/utils/routeHandler";
import { successResponse } from "@/lib/response";
import { requireAuth } from "@/middleware/withAuth";
import { analystOrAbove } from "@/middleware/withRole";
import { parseQuery } from "@/utils/validate";
import { dashboardQuerySchema } from "@/schemas/record.schema";
import { dashboardService } from "@/services/dashboard.service";

// GET /api/v1/dashboard/categories
export const GET = withErrorHandler(
  analystOrAbove(async (req: NextRequest) => {
    const user = requireAuth(req);
    const query = parseQuery(dashboardQuerySchema, req.nextUrl.searchParams);

    const categories = await dashboardService.getCategoryTotals(user, query);
    return successResponse(categories, "Category totals fetched successfully");
  })
);