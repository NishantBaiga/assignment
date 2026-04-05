import jwt from "jsonwebtoken";
import { JWTPayload } from "@/types";
import { AppError } from "@/utils/AppError";

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? "7d";

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is not set.");
}

// ---------------------------------------------------------------------------
// Sign — creates a new token
// ---------------------------------------------------------------------------
export function signToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  } as jwt.SignOptions);
}

// ---------------------------------------------------------------------------
// Verify — decodes and validates a token, throws AppError on failure
// ---------------------------------------------------------------------------
export function verifyToken(token: string): JWTPayload {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw AppError.tokenExpired();
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw AppError.invalidToken();
    }
    throw AppError.unauthorized();
  }
}