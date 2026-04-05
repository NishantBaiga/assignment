import { NextRequest } from "next/server";
import { withErrorHandler } from "@/utils/routeHandler";
import { successResponse } from "@/lib/response";
import { requireAuth } from "@/middleware/withAuth";
import { analystOrAbove, allRoles } from "@/middleware/withRole";
import { parseBody, parseQuery } from "@/utils/validate";
import { createRecordSchema, recordQuerySchema } from "@/schemas/record.schema";
import { recordService } from "@/services/record.service";

// GET /api/v1/records
// All roles can read — viewer, analyst, admin
export const GET = withErrorHandler(
  allRoles(async (req: NextRequest) => {
    const user = requireAuth(req);
    const query = parseQuery(recordQuerySchema, req.nextUrl.searchParams);

    const result = await recordService.list(query, user);
    return successResponse(result, "Records fetched successfully");
  })
);

// POST /api/v1/records
// Analyst and admin can create records
export const POST = withErrorHandler(
  analystOrAbove(async (req: NextRequest) => {
    const user = requireAuth(req);
    const body = await req.json();
    const input = parseBody(createRecordSchema, body);

    const record = await recordService.create(input, user);
    return successResponse(record, "Record created successfully", 201);
  })
);