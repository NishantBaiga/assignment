import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth/jwt";
import { AppError } from "@/utils/AppError";
import { errorResponse } from "@/lib/response";
import { JWTPayload } from "@/types";

// ---------------------------------------------------------------------------
// Augment NextRequest to carry the decoded user payload
// We store it in a custom header internally since Next.js route handlers
// don't support attaching arbitrary properties to NextRequest directly
// ---------------------------------------------------------------------------
export const AUTH_USER_HEADER = "x-auth-user";

// ---------------------------------------------------------------------------
// extractToken — checks Authorization header first, then cookie
// ---------------------------------------------------------------------------
function extractToken(req: NextRequest): string | null {
  // 1. Bearer token from Authorization header (API clients / Postman)
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }

  // 2. HttpOnly cookie (browser clients)
  const cookieName = process.env.JWT_COOKIE_NAME ?? "finance_token";
  const cookie = req.cookies.get(cookieName);
  if (cookie?.value) {
    return cookie.value;
  }

  return null;
}

// ---------------------------------------------------------------------------
// withAuth — middleware wrapper
// ---------------------------------------------------------------------------
type RouteContext = {
  params: Promise<Record<string, string>>;
};

type AuthenticatedHandler = (
  req: NextRequest,
  ctx?: RouteContext
) => Promise<NextResponse>;

export function withAuth(handler: AuthenticatedHandler): AuthenticatedHandler {
  return async (req: NextRequest, ctx?: RouteContext) => {
    try {
      const token = extractToken(req);

      if (!token) {
        throw AppError.unauthorized("No authentication token provided");
      }

      const payload = verifyToken(token);

      // Block inactive users at the middleware level
      if (payload.status === "inactive") {
        throw AppError.accountInactive();
      }

      // Attach payload to request via a custom header so handlers can read it
      // We serialize to JSON since headers are string-only
      const requestWithUser = new NextRequest(req, {
        headers: new Headers({
          ...Object.fromEntries(req.headers.entries()),
          [AUTH_USER_HEADER]: JSON.stringify(payload),
        }),
      });

      return await handler(requestWithUser, ctx);
    } catch (error) {
      return errorResponse(error);
    }
  };
}

// ---------------------------------------------------------------------------
// requireAuth — extracts the attached user from the request inside a handler
// Call this at the top of any handler wrapped with withAuth
// ---------------------------------------------------------------------------
export function requireAuth(req: NextRequest): JWTPayload {
  const raw = req.headers.get(AUTH_USER_HEADER);

  if (!raw) {
    throw AppError.unauthorized();
  }

  try {
    return JSON.parse(raw) as JWTPayload;
  } catch {
    throw AppError.unauthorized();
  }
}