import { NextRequest } from "next/server";
import { Types } from "mongoose";

// ---------------------------------------------------------------------------
// Roles
// ---------------------------------------------------------------------------
export type UserRole = "viewer" | "analyst" | "admin";
export type UserStatus = "active" | "inactive";

// ---------------------------------------------------------------------------
// Authenticated request — extends NextRequest with the decoded JWT payload
// ---------------------------------------------------------------------------
export interface AuthenticatedRequest extends NextRequest {
  user: JWTPayload;
}

// ---------------------------------------------------------------------------
// JWT payload — what gets encoded into the token
// ---------------------------------------------------------------------------
export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  status: UserStatus;
}

// ---------------------------------------------------------------------------
// Financial record types
// ---------------------------------------------------------------------------
export type RecordType = "income" | "expense";

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------
export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// ---------------------------------------------------------------------------
// Record filter options — passed from route handler to service
// ---------------------------------------------------------------------------
export interface RecordFilters {
  userId?: string | Types.ObjectId;
  type?: RecordType;
  category?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface RecordSortOptions {
  field: "date" | "amount" | "createdAt";
  order: "asc" | "desc";
}



