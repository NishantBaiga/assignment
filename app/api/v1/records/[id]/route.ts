import { NextRequest } from "next/server";
import { withErrorHandler } from "@/utils/routeHandler";
import { successResponse } from "@/lib/response";
import { requireAuth } from "@/middleware/withAuth";
import { analystOrAbove, allRoles } from "@/middleware/withRole";
import { parseBody } from "@/utils/validate";
import { updateRecordSchema } from "@/schemas/record.schema";
import { recordService } from "@/services/record.service";
import { RouteContext } from "@/types";

// GET /api/v1/records/:id
export const GET = withErrorHandler(
  allRoles(async (req: NextRequest, ctx?: RouteContext) => {
    const user = requireAuth(req);
    const { id } = await ctx!.params;

    const record = await recordService.getById(id, user);
    return successResponse(record, "Record fetched successfully");
  })
);

// PATCH /api/v1/records/:id
// Analyst and admin can update
export const PATCH = withErrorHandler(
  analystOrAbove(async (req: NextRequest, ctx?: RouteContext) => {
    const user = requireAuth(req);
    const { id } = await ctx!.params;

    const body = await req.json();
    const input = parseBody(updateRecordSchema, body);

    const record = await recordService.update(id, input, user);
    return successResponse(record, "Record updated successfully");
  })
);

// DELETE /api/v1/records/:id — soft delete
// Analyst and admin can delete
export const DELETE = withErrorHandler(
  analystOrAbove(async (req: NextRequest, ctx?: RouteContext) => {
    const user = requireAuth(req);
    const { id } = await ctx!.params;

    await recordService.softDelete(id, user);
    return successResponse(null, "Record deleted successfully");
  })
);