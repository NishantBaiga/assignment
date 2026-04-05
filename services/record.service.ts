import { connectDB } from "@/lib/db/connect";
import { AppError } from "@/utils/AppError";
import FinancialRecord, {
  IFinancialRecord,
  notDeleted,
} from "@/models/FinancialRecord";
import {
  CreateRecordInput,
  UpdateRecordInput,
  RecordQuery,
} from "@/schemas/record.schema";
import { PaginatedResult, JWTPayload } from "@/types";
import mongoose from "mongoose";

// ---------------------------------------------------------------------------
// Safe record shape returned to clients
// ---------------------------------------------------------------------------
export interface SafeRecord {
  id: string;
  userId: string;
  amount: number;
  type: string;
  category: string;
  date: Date;
  note: string;
  createdBy: string;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

function toSafeRecord(record: IFinancialRecord): SafeRecord {
  return {
    id: record._id.toString(),
    userId: record.userId.toString(),
    amount: record.amount,
    type: record.type,
    category: record.category,
    date: record.date,
    note: record.note,
    createdBy: record.createdBy.toString(),
    updatedBy: record.updatedBy ? record.updatedBy.toString() : null,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

// ---------------------------------------------------------------------------
// Build match stage — shared between list and dashboard queries
// ---------------------------------------------------------------------------
function buildMatchFilter(
  query: RecordQuery,
  userId: string,
): Record<string, unknown> {
  // const match: Record<string, unknown> = {
  //   userId: new mongoose.Types.ObjectId(userId),
  //   isDeleted: false,
  // };

  const match: Record<string, unknown> = {
    ...notDeleted(),
    userId: new mongoose.Types.ObjectId(userId),
  };
  
  if (query.type) match.type = query.type;
  if (query.category) match.category = query.category;

  if (query.startDate || query.endDate) {
    const dateFilter: Record<string, Date> = {};
    if (query.startDate) dateFilter.$gte = query.startDate;
    if (query.endDate) dateFilter.$lte = query.endDate;
    match.date = dateFilter;
  }

  return match;
}

// ---------------------------------------------------------------------------
// Record Service
// ---------------------------------------------------------------------------
export const recordService = {
  // -------------------------------------------------------------------------
  // create
  // -------------------------------------------------------------------------
  async create(
    input: CreateRecordInput,
    user: JWTPayload,
  ): Promise<SafeRecord> {
    await connectDB();

    const record = await FinancialRecord.create({
      userId: new mongoose.Types.ObjectId(user.userId),
      amount: input.amount,
      type: input.type,
      category: input.category,
      date: input.date,
      note: input.note ?? "",
      createdBy: new mongoose.Types.ObjectId(user.userId),
      updatedBy: null,
      isDeleted: false,
    });

    return toSafeRecord(record);
  },

  // -------------------------------------------------------------------------
  // list — paginated, filtered, sorted
  // Admins see all records; viewers/analysts see only their own
  // -------------------------------------------------------------------------
  async list(
    query: RecordQuery,
    user: JWTPayload,
  ): Promise<PaginatedResult<SafeRecord>> {
    await connectDB();

    const { page, limit, sortField, sortOrder } = query;
    const skip = (page - 1) * limit;
    const sortDir = sortOrder === "asc" ? 1 : -1;

    // Admins can see all records across all users
    // Viewers and analysts only see their own
    const match = buildMatchFilter(query, user.userId);

    if (user.role !== "admin") {
      match.userId = new mongoose.Types.ObjectId(user.userId);
    } else {
      // Admin: remove userId restriction but keep other filters
      delete match.userId;
    }

    const [records, total] = await Promise.all([
      FinancialRecord.find(match)
        .sort({ [sortField]: sortDir })
        .skip(skip)
        .limit(limit)
        .lean(),
      FinancialRecord.countDocuments(match),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: records.map((r) => toSafeRecord(r as unknown as IFinancialRecord)),
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  },

  // -------------------------------------------------------------------------
  // getById
  // -------------------------------------------------------------------------
  async getById(recordId: string, user: JWTPayload): Promise<SafeRecord> {
    await connectDB();

    if (!mongoose.Types.ObjectId.isValid(recordId)) {
      throw AppError.badRequest("Invalid record ID format");
    }

    // const record = await FinancialRecord.findOne({
    //   _id: recordId,
    //   isDeleted: false,
    // });

    const record = await FinancialRecord.findOne({
      ...notDeleted(),
      _id: recordId,
    });
    if (!record) {
      throw AppError.notFound("Financial record");
    }

    // Non-admins can only view their own records
    if (user.role !== "admin" && record.userId.toString() !== user.userId) {
      throw AppError.forbidden("You do not have access to this record");
    }

    return toSafeRecord(record);
  },

  // -------------------------------------------------------------------------
  // update — analyst and admin can update
  // Users can only update their own records; admin can update any
  // -------------------------------------------------------------------------
  async update(
    recordId: string,
    input: UpdateRecordInput,
    user: JWTPayload,
  ): Promise<SafeRecord> {
    await connectDB();

    if (!mongoose.Types.ObjectId.isValid(recordId)) {
      throw AppError.badRequest("Invalid record ID format");
    }

    // const record = await FinancialRecord.findOne({
    //   _id: recordId,
    //   isDeleted: false,
    // });

    const record = await FinancialRecord.findOne({
      ...notDeleted(),
      _id: recordId,
    });

    if (!record) {
      throw AppError.notFound("Financial record");
    }

    // Ownership check for non-admins
    if (user.role !== "admin" && record.userId.toString() !== user.userId) {
      throw AppError.forbidden("You can only update your own records");
    }

    // Apply only provided fields
    if (input.amount !== undefined) record.amount = input.amount;
    if (input.type !== undefined) record.type = input.type;
    if (input.category !== undefined) record.category = input.category;
    if (input.date !== undefined) record.date = input.date;
    if (input.note !== undefined) record.note = input.note;

    record.updatedBy = new mongoose.Types.ObjectId(user.userId);

    await record.save();

    return toSafeRecord(record);
  },

  // -------------------------------------------------------------------------
  // softDelete — marks record as deleted without removing from DB
  // -------------------------------------------------------------------------
  async softDelete(recordId: string, user: JWTPayload): Promise<void> {
    await connectDB();

    if (!mongoose.Types.ObjectId.isValid(recordId)) {
      throw AppError.badRequest("Invalid record ID format");
    }

    // const record = await FinancialRecord.findOne({
    //   _id: recordId,
    //   isDeleted: false,
    // });

    const record = await FinancialRecord.findOne({
      ...notDeleted(),
      _id: recordId,
    });

    if (!record) {
      throw AppError.notFound("Financial record");
    }

    // Ownership check for non-admins
    if (user.role !== "admin" && record.userId.toString() !== user.userId) {
      throw AppError.forbidden("You can only delete your own records");
    }

    await FinancialRecord.softDelete(recordId, user.userId);
  },
};
