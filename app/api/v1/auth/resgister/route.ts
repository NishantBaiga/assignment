import { NextRequest } from "next/server";
import { withErrorHandler } from "@/utils/routeHandler";
import { successResponse } from "@/lib/response";
import { parseBody } from "@/utils/validate";
import { registerSchema } from "@/schemas/auth.schema";
import { authService } from "@/services/auth.service";
import { serialize } from "cookie";

export const POST = withErrorHandler(async (req: NextRequest) => {
  const body = await req.json();
  const input = parseBody(registerSchema, body);

  const { user, token } = await authService.register(input);

  // Set HttpOnly cookie for browser clients
  const cookieName = process.env.JWT_COOKIE_NAME ?? "finance_token";
  const cookieHeader = serialize(cookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });

  const response = successResponse(
    { user, token },
    "Account created successfully",
    201
  );

  response.headers.set("Set-Cookie", cookieHeader);
  return response;
});