import { ZodSchema, ZodError } from "zod";
import { AppError } from "@/utils/AppError";

export function parseBody<T>(schema: ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw AppError.validation("Validation failed", formatZodErrors(result.error));
  }
  return result.data;
}

export function parseQuery<T>(schema: ZodSchema<T>, searchParams: URLSearchParams): T {
  const raw: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    raw[key] = value;
  });

  const result = schema.safeParse(raw);
  if (!result.success) {
    throw AppError.validation("Invalid query parameters", formatZodErrors(result.error));
  }
  return result.data;
}

function formatZodErrors(error: ZodError) {
  return error.issues.map((e) => ({
    field: e.path.join(".") || "root",
    message: e.message,
    // Zod v4: code is now 'invalid_value' instead of 'invalid_enum_value'
    ...(e.code === "invalid_value" && {
      received: (e as { input?: unknown }).input,
    }),
  }));
}