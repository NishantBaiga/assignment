import { connectDB } from "@/lib/db/connect";
import { AppError } from "@/utils/AppError";
import User, { IUser } from "@/models/Users";
import { UpdateRoleInput, UpdateStatusInput, ListUsersQuery } from "@/schemas/user.schema";
import { PaginatedResult } from "@/types";

// ---------------------------------------------------------------------------
// Safe user shape — reused across all user responses
// ---------------------------------------------------------------------------
export interface SafeUser {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  lastLogin: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

function toSafeUser(user: IUser): SafeUser {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    lastLogin: user.lastLogin,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

// ---------------------------------------------------------------------------
// User Service
// ---------------------------------------------------------------------------
export const userService = {

  // -------------------------------------------------------------------------
  // listUsers — admin only, paginated with filters
  // -------------------------------------------------------------------------
  async listUsers(query: ListUsersQuery): Promise<PaginatedResult<SafeUser>> {
    await connectDB();

    const { page, limit, role, status, search } = query;
    const skip = (page - 1) * limit;

    // Build filter dynamically
    const filter: Record<string, unknown> = {};

    if (role) filter.role = role;
    if (status) filter.status = status;

    if (search) {
      // Case-insensitive search on name or email
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: users.map((u) => toSafeUser(u as unknown as IUser)),
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
  // getUserById — any authenticated user can fetch a profile
  // Viewers/analysts can only fetch their own profile
  // Admins can fetch any profile
  // -------------------------------------------------------------------------
  async getUserById(
    targetId: string,
    requesterId: string,
    requesterRole: string
  ): Promise<SafeUser> {
    await connectDB();

    // Non-admins can only view their own profile
    if (requesterRole !== "admin" && targetId !== requesterId) {
      throw AppError.forbidden("You can only view your own profile");
    }

    const user = await User.findById(targetId);
    if (!user) {
      throw AppError.notFound("User");
    }

    return toSafeUser(user);
  },

  // -------------------------------------------------------------------------
  // updateRole — admin only
  // -------------------------------------------------------------------------
  async updateRole(
    targetId: string,
    input: UpdateRoleInput,
    requesterId: string
  ): Promise<SafeUser> {
    await connectDB();

    // Prevent admin from demoting themselves
    if (targetId === requesterId) {
      throw AppError.badRequest("You cannot change your own role");
    }

    const user = await User.findById(targetId);
    if (!user) {
      throw AppError.notFound("User");
    }

    // No-op check
    if (user.role === input.role) {
      throw AppError.badRequest(`User already has the '${input.role}' role`);
    }

    user.role = input.role;
    await user.save();

    return toSafeUser(user);
  },

  // -------------------------------------------------------------------------
  // updateStatus — admin only
  // -------------------------------------------------------------------------
  async updateStatus(
    targetId: string,
    input: UpdateStatusInput,
    requesterId: string
  ): Promise<SafeUser> {
    await connectDB();

    // Prevent admin from deactivating themselves
    if (targetId === requesterId) {
      throw AppError.badRequest("You cannot change your own status");
    }

    const user = await User.findById(targetId);
    if (!user) {
      throw AppError.notFound("User");
    }

    if (user.status === input.status) {
      throw AppError.badRequest(`User is already ${input.status}`);
    }

    user.status = input.status;
    await user.save();

    return toSafeUser(user);
  },

  // -------------------------------------------------------------------------
  // deleteUser — admin only, hard delete
  // -------------------------------------------------------------------------
  async deleteUser(
    targetId: string,
    requesterId: string
  ): Promise<void> {
    await connectDB();

    if (targetId === requesterId) {
      throw AppError.badRequest("You cannot delete your own account");
    }

    const user = await User.findById(targetId);
    if (!user) {
      throw AppError.notFound("User");
    }

    // Prevent deleting the last admin
    if (user.role === "admin") {
      const adminCount = await User.countDocuments({ role: "admin" });
      if (adminCount <= 1) {
        throw AppError.badRequest(
          "Cannot delete the last admin account. Promote another user first."
        );
      }
    }

    await User.findByIdAndDelete(targetId);
  },
};