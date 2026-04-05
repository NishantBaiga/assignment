import mongoose, { Document, Model, Schema } from "mongoose";
import { RecordType } from "@/types";



// ---------------------------------------------------------------------------
// Interface
// ---------------------------------------------------------------------------
export interface IFinancialRecord extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  amount: number;
  type: RecordType;
  category: string;
  date: Date;
  note: string;
  createdBy: mongoose.Types.ObjectId;
  updatedBy: mongoose.Types.ObjectId | null;
  isDeleted: boolean;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// ---------------------------------------------------------------------------
// Predefined categories — enforced at schema level
// ---------------------------------------------------------------------------
export const RECORD_CATEGORIES = [
  // Income
  "salary",
  "freelance",
  "investment",
  "rental",
  "business",
  "gift",
  // Expense
  "food",
  "transport",
  "utilities",
  "healthcare",
  "education",
  "entertainment",
  "shopping",
  "rent",
  "insurance",
  "taxes",
  // General
  "other",
] as const;

export type RecordCategory = (typeof RECORD_CATEGORIES)[number];

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------
const financialRecordSchema = new Schema<IFinancialRecord>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "userId is required"],
      index: true,
    },

    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [0.01, "Amount must be greater than 0"],
      // Store as float, rounded to 2 decimal places via setter
      set: (v: number) => Math.round(v * 100) / 100,
    },

    type: {
      type: String,
      enum: {
        values: ["income", "expense"] satisfies RecordType[],
        message: "Type must be income or expense",
      },
      required: [true, "Type is required"],
      index: true,
    },

    category: {
      type: String,
      enum: {
        values: RECORD_CATEGORIES as unknown as string[],
        message: `Category must be one of: ${RECORD_CATEGORIES.join(", ")}`,
      },
      required: [true, "Category is required"],
      index: true,
    },

    date: {
      type: Date,
      required: [true, "Date is required"],
      index: true,
    },

    note: {
      type: String,
      trim: true,
      maxlength: [500, "Note cannot exceed 500 characters"],
      default: "",
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // Soft delete fields
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },

    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// ---------------------------------------------------------------------------
// Compound indexes — cover the most common query patterns
// ---------------------------------------------------------------------------

// Most frequent query: "get all records for user X, sorted by date"
financialRecordSchema.index({ userId: 1, date: -1 });

// Dashboard aggregations filter on these together constantly
financialRecordSchema.index({ userId: 1, type: 1, isDeleted: 1 });

// Category-wise totals + trends
financialRecordSchema.index({ userId: 1, category: 1, isDeleted: 1 });

// Date range queries
financialRecordSchema.index({ userId: 1, date: 1, isDeleted: 1 });



// ---------------------------------------------------------------------------
// Query helper — automatically excludes soft-deleted records
// Attach to every query that should respect soft delete
// ---------------------------------------------------------------------------
// financialRecordSchema.query.notDeleted =
//   function (this: mongoose.Query<unknown, IFinancialRecord>) {
//     return this.where({ isDeleted: false });
//   };

// ---------------------------------------------------------------------------
// Static — soft delete helper
// ---------------------------------------------------------------------------
financialRecordSchema.statics.softDelete = async function (
  id: string,
  deletedBy: string
) {
  return this.findByIdAndUpdate(
    id,
    {
      isDeleted: true,
      deletedAt: new Date(),
      updatedBy: deletedBy,
    },
    { new: true }
  );
};

// ---------------------------------------------------------------------------
// Model
// ---------------------------------------------------------------------------
export interface IFinancialRecordModel extends Model<IFinancialRecord> {
  softDelete(id: string, deletedBy: string): Promise<IFinancialRecord | null>;
}

const FinancialRecord =
  (mongoose.models.FinancialRecord as IFinancialRecordModel) ||
  mongoose.model<IFinancialRecord, IFinancialRecordModel>(
    "FinancialRecord",
    financialRecordSchema
  );

export default FinancialRecord;

export function notDeleted(): { isDeleted: { $ne: boolean } } {
  return { isDeleted: { $ne: true } };
}