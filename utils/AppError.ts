// ---------------------------------------------------------------------------
// Machine-readable error codes — used by the frontend to handle errors
// programmatically without parsing strings
// ---------------------------------------------------------------------------
export type ErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "BAD_REQUEST"
  | "INTERNAL_ERROR"
  | "INVALID_TOKEN"
  | "TOKEN_EXPIRED"
  | "ACCOUNT_INACTIVE";

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode;
  public readonly details?: unknown;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number,
    code: ErrorCode,
    details?: unknown
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true; // Distinguishes expected errors from bugs

    // Maintains proper stack trace in V8
    Error.captureStackTrace(this, this.constructor);
    Object.setPrototypeOf(this, AppError.prototype);
  }

  // ---------------------------------------------------------------------------
  // Static factory methods — clean call sites throughout the codebase
  // ---------------------------------------------------------------------------

  static badRequest(message: string, details?: unknown) {
    return new AppError(message, 400, "BAD_REQUEST", details);
  }

  static unauthorized(message = "Authentication required") {
    return new AppError(message, 401, "UNAUTHORIZED");
  }

  static invalidToken(message = "Invalid or malformed token") {
    return new AppError(message, 401, "INVALID_TOKEN");
  }

  static tokenExpired(message = "Token has expired. Please log in again.") {
    return new AppError(message, 401, "TOKEN_EXPIRED");
  }

  static forbidden(message = "You do not have permission to perform this action") {
    return new AppError(message, 403, "FORBIDDEN");
  }

  static notFound(resource = "Resource") {
    return new AppError(`${resource} not found`, 404, "NOT_FOUND");
  }

  static conflict(message: string) {
    return new AppError(message, 409, "CONFLICT");
  }

  static validation(message: string, details?: unknown) {
    return new AppError(message, 422, "VALIDATION_ERROR", details);
  }

  static internal(message = "An unexpected error occurred") {
    return new AppError(message, 500, "INTERNAL_ERROR");
  }

  static accountInactive() {
    return new AppError(
      "Your account has been deactivated. Contact an administrator.",
      403,
      "ACCOUNT_INACTIVE"
    );
  }
}