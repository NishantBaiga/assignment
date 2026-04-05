import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/connect";
import { successResponse } from "@/lib/response";
import { withErrorHandler } from "@/utils/routeHandler";
import mongoose from "mongoose";

export const GET = withErrorHandler(async (_req: NextRequest) => {
  await connectDB();

  return successResponse(
    {
      status: "healthy",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV ?? "development",
      database: {
        status:
          mongoose.connection.readyState === 1 ? "connected" : "disconnected",
        name: mongoose.connection.name,
      },
      version: "1.0.0",
    },
    "Service is healthy"
  );
});