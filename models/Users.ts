import mongoose, { Document, Model, Schema } from "mongoose";
import { UserRole, UserStatus } from "@/types";

// ---------------------------------------------------------------------------
// Interface — TypeScript shape of a User document
// ---------------------------------------------------------------------------
export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  status: UserStatus;
  lastLogin: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------
const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [50, "Name cannot exceed 50 characters"],
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\S+@\S+\.\S+$/,
        "Please provide a valid email address",
      ],
    },

    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
      select: false, // Never returned in queries unless explicitly asked
    },

    role: {
      type: String,
      enum: {
        values: ["viewer", "analyst", "admin"] satisfies UserRole[],
        message: "Role must be viewer, analyst, or admin",
      },
      default: "viewer",
    },

    status: {
      type: String,
      enum: {
        values: ["active", "inactive"] satisfies UserStatus[],
        message: "Status must be active or inactive",
      },
      default: "active",
    },

    lastLogin: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true, // Adds createdAt + updatedAt automatically
    versionKey: false, // Removes __v field
  }
);

// ---------------------------------------------------------------------------
// Indexes
// ---------------------------------------------------------------------------
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ role: 1 });
userSchema.index({ status: 1 });

// ---------------------------------------------------------------------------
// Instance method — strips password before sending to client
// ---------------------------------------------------------------------------
userSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

// ---------------------------------------------------------------------------
// Static method — find active user by email (used in login)
// ---------------------------------------------------------------------------
userSchema.statics.findByEmail = function (email: string) {
  return this.findOne({ email: email.toLowerCase() }).select("+password");
};

// ---------------------------------------------------------------------------
// Model — prevent recompilation during Next.js hot reload
// ---------------------------------------------------------------------------
export interface IUserModel extends Model<IUser> {
  findByEmail(email: string): Promise<IUser | null>;
}

const User =
  (mongoose.models.User as IUserModel) ||
  mongoose.model<IUser, IUserModel>("User", userSchema);

export default User;