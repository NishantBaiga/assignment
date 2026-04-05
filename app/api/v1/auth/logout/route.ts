import { NextRequest } from "next/server";
import { withErrorHandler } from "@/utils/routeHandler";
import { successResponse } from "@/lib/response";
import { serialize } from "cookie";

export const POST = withErrorHandler(async (_req: NextRequest) => {
  const cookieName = process.env.JWT_COOKIE_NAME ?? "finance_token";

  // Clear the cookie by setting maxAge to 0
  const cookieHeader = serialize(cookieName, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });

  const response = successResponse(null, "Logged out successfully");
  response.headers.set("Set-Cookie", cookieHeader);
  return response;
});