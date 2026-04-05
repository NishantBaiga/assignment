import { NextRequest, NextResponse } from "next/server";
import { errorResponse } from "@/lib/response";
import { RouteContext } from "@/types";
// ---------------------------------------------------------------------------
// Context type Next.js passes to dynamic route handlers
// ---------------------------------------------------------------------------


type RouteHandler = (
  req: NextRequest,
  ctx?: RouteContext
) => Promise<NextResponse>;

// ---------------------------------------------------------------------------
// withErrorHandler — wraps any route handler in a try/catch
// All errors bubble up to errorResponse() for uniform formatting
// ---------------------------------------------------------------------------
export function withErrorHandler(handler: RouteHandler): RouteHandler {
  return async (req: NextRequest, ctx?: RouteContext) => {
    try {
      return await handler(req, ctx);
    } catch (error) {
      return errorResponse(error);
    }
  };
}