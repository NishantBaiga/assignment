import { connectDB } from "@/lib/db/connect";
import { hashPassword, comparePassword } from "@/lib/auth/password";
import { signToken } from "@/lib/auth/jwt";
import { AppError } from "@/utils/AppError";
import User, { IUser } from "@/models/Users";
import { RegisterInput, LoginInput } from "@/schemas/auth.schema";
import { JWTPayload } from "@/types";

// ---------------------------------------------------------------------------
// Safe user shape — never expose password to callers
// ---------------------------------------------------------------------------
export interface SafeUser {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  lastLogin: Date | null;
  createdAt: Date;
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
  };
}

// ---------------------------------------------------------------------------
// Auth Service
// ---------------------------------------------------------------------------
export const authService = {

  // -------------------------------------------------------------------------
  // register
  // -------------------------------------------------------------------------
  async register(input: RegisterInput): Promise<{ user: SafeUser; token: string }> {
    await connectDB();

    // Check duplicate email
    const existing = await User.findOne({ email: input.email });
    if (existing) {
      throw AppError.conflict("An account with this email already exists");
    }

    const hashed = await hashPassword(input.password);

    const user = await User.create({
      name: input.name,
      email: input.email,
      password: hashed,
      role: "viewer",   // Default role — admin promotes later
      status: "active",
    });

    const payload: JWTPayload = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      status: user.status,
    };

    const token = signToken(payload);

    return { user: toSafeUser(user), token };
  },

  // -------------------------------------------------------------------------
  // login
  // -------------------------------------------------------------------------
  async login(input: LoginInput): Promise<{ user: SafeUser; token: string }> {
    await connectDB();

    // findByEmail uses +password select
    const user = await User.findByEmail(input.email);

    if (!user) {
      // Deliberately vague — don't leak whether email exists
      throw AppError.unauthorized("Invalid email or password");
    }

    if (user.status === "inactive") {
      throw AppError.accountInactive();
    }

    const isMatch = await comparePassword(input.password, user.password);
    if (!isMatch) {
      throw AppError.unauthorized("Invalid email or password");
    }

    // Update last login timestamp
    await User.findByIdAndUpdate(user._id, { lastLogin: new Date() });
    user.lastLogin = new Date();

    const payload: JWTPayload = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      status: user.status,
    };

    const token = signToken(payload);

    return { user: toSafeUser(user), token };
  },

  // -------------------------------------------------------------------------
  // getMe — fetch current user from DB (always fresh, not from token)
  // -------------------------------------------------------------------------
  async getMe(userId: string): Promise<SafeUser> {
    await connectDB();

    const user = await User.findById(userId);
    if (!user) {
      throw AppError.notFound("User");
    }

    if (user.status === "inactive") {
      throw AppError.accountInactive();
    }

    return toSafeUser(user);
  },
};