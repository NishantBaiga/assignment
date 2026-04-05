import { NextResponse } from "next/server";
import { AppError } from "@/utils/AppError";
import { ZodError } from "zod";

// ---------------------------------------------------------------------------
// Response shape contracts
// ---------------------------------------------------------------------------
interface SuccessResponse<T> {
  success: true;
  message: string;
  data: T;
}

interface ErrorResponse {
  success: false;
  message: string;
  error: {
    code: string;
    details?: unknown;
  };
}

// ---------------------------------------------------------------------------
// Success response
// ---------------------------------------------------------------------------
export function successResponse<T>(
  data: T,
  message = "Success",
  statusCode = 200
): NextResponse<SuccessResponse<T>> {
  return NextResponse.json(
    { success: true, message, data },
    { status: statusCode }
  );
}

// ---------------------------------------------------------------------------
// Error response — handles AppError, ZodError, and unknown errors uniformly
// ---------------------------------------------------------------------------
export function errorResponse(error: unknown): NextResponse<ErrorResponse> {
  // Known operational error
  if (error instanceof AppError) {
    return NextResponse.json(
      {
        success: false,
        message: error.message,
        error: {
          code: error.code,
          ...(error.details !== undefined && { details: error.details }),
        },
      },
      { status: error.statusCode }
    );
  }

  // Zod validation error — format field-level errors
  if (error instanceof ZodError) {
    const details = error.issues.map((e) => ({
      field: e.path.join("."),
      message: e.message,
    }));

    return NextResponse.json(
      {
        success: false,
        message: "Validation failed",
        error: {
          code: "VALIDATION_ERROR",
          details,
        },
      },
      { status: 422 }
    );
  }

  // Mongoose duplicate key error (e.g., duplicate email)
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: number }).code === 11000
  ) {
    const keyValue = (error as { keyValue?: Record<string, unknown> }).keyValue;
    const field = keyValue ? Object.keys(keyValue)[0] : "field";
    return NextResponse.json(
      {
        success: false,
        message: `${field} already exists`,
        error: { code: "CONFLICT" },
      },
      { status: 409 }
    );
  }

  // Unknown / programmer error — don't leak internals
  console.error("Unhandled error:", error);
  return NextResponse.json(
    {
      success: false,
      message: "An unexpected error occurred",
      error: { code: "INTERNAL_ERROR" },
    },
    { status: 500 }
  );
}