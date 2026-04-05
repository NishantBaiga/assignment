import { z } from "zod";
import { RECORD_CATEGORIES } from "@/models/FinancialRecord";
import { RecordType } from "@/types";

const amountField = z
  .number({ error: "Amount must be a number" })
  .positive("Amount must be greater than 0")
  .max(999_999_999, "Amount cannot exceed 999,999,999")
  .multipleOf(0.01, "Amount can have at most 2 decimal places");

const typeField = z.enum(["income", "expense"] as const, {
  error: "Type must be income or expense",
});

const categoryField = z.enum(RECORD_CATEGORIES, {
  error: `Category must be one of: ${RECORD_CATEGORIES.join(", ")}`,
});

const dateField = z.union([
  z.string().min(1, "Date is required").datetime("Date must be a valid ISO 8601 datetime string"),
  z.date(),
]).transform((val) => new Date(val));

const noteField = z
  .string()
  .trim()
  .max(500, "Note cannot exceed 500 characters")
  .optional()
  .default("");

// ---------------------------------------------------------------------------
// Create record
// ---------------------------------------------------------------------------
export const createRecordSchema = z.object({
  amount: amountField,
  type: typeField,
  category: categoryField,
  date: dateField,
  note: noteField,
});

export type CreateRecordInput = z.infer<typeof createRecordSchema>;

// ---------------------------------------------------------------------------
// Update record
// ---------------------------------------------------------------------------
export const updateRecordSchema = z
  .object({
    amount: amountField.optional(),
    type: typeField.optional(),
    category: categoryField.optional(),
    date: dateField.optional(),
    note: z.string().trim().max(500).optional(),
  })
  .refine(
    (data) => Object.keys(data).length > 0,
    { message: "At least one field must be provided for update" }
  );

export type UpdateRecordInput = z.infer<typeof updateRecordSchema>;

// ---------------------------------------------------------------------------
// Record query params
// ---------------------------------------------------------------------------
export const recordQuerySchema = z
  .object({
    type: typeField.optional(),
    category: categoryField.optional(),

    startDate: z
      .string()
      .datetime("startDate must be a valid ISO 8601 string")
      .optional()
      .transform((val) => (val ? new Date(val) : undefined)),

    endDate: z
      .string()
      .datetime("endDate must be a valid ISO 8601 string")
      .optional()
      .transform((val) => (val ? new Date(val) : undefined)),

    page: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 1))
      .pipe(z.number().min(1, "Page must be at least 1")),

    limit: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 10))
      .pipe(z.number().min(1).max(100, "Limit cannot exceed 100")),

    sortField: z
      .enum(["date", "amount", "createdAt"] as const)
      .optional()
      .default("date"),

    sortOrder: z
      .enum(["asc", "desc"] as const)
      .optional()
      .default("desc"),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return data.startDate <= data.endDate;
      }
      return true;
    },
    {
      message: "startDate must be before or equal to endDate",
      path: ["startDate"],
    }
  );

export type RecordQuery = z.infer<typeof recordQuerySchema>;

// ---------------------------------------------------------------------------
// Dashboard query
// ---------------------------------------------------------------------------
export const dashboardQuerySchema = z.object({
  startDate: z
    .string()
    .datetime()
    .optional()
    .transform((val) => (val ? new Date(val) : undefined)),

  endDate: z
    .string()
    .datetime()
    .optional()
    .transform((val) => (val ? new Date(val) : undefined)),

  months: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 6))
    .pipe(z.number().min(1).max(24, "Cannot exceed 24 months")),
});

export type DashboardQuery = z.infer<typeof dashboardQuerySchema>;