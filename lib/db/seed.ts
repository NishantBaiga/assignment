import mongoose from "mongoose";
import { connectDB } from "./connect";
import User from "@/models/Users";
import { hashPassword } from "@/lib/auth/password";

async function seed() {
  await connectDB();

  const existing = await User.findOne({ email: "admin@finance.dev" });

  if (existing) {
    console.log("⚠️  Seed already run. Admin user exists.");
    await mongoose.disconnect();
    return;
  }

  const hashed = await hashPassword("Admin@12345");

  await User.create({
    name: "Super Admin",
    email: "admin@finance.dev",
    password: hashed,
    role: "admin",
    status: "active",
  });

  console.log("✅ Admin user created:");
  console.log("   Email:    admin@finance.dev");
  console.log("   Password: Admin@12345");
  console.log("   Role:     admin");

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});