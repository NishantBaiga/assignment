import mongoose from "mongoose";
import { env } from "process";

// ---------------------------------------------------------------------------
// Connection cache — persists across hot reloads in dev & across invocations
// in the same serverless container in production
// ---------------------------------------------------------------------------
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

// Attach to global so Next.js dev hot-reload doesn't create new connections
declare global {
  // eslint-disable-next-line no-var
  var __mongooseCache: MongooseCache | undefined;
}

const cache: MongooseCache = global.__mongooseCache ?? {
  conn: null,
  promise: null,
};

if (!global.__mongooseCache) {
  global.__mongooseCache = cache;
}

// ---------------------------------------------------------------------------
// connectDB — call this at the top of every route handler or service
// ---------------------------------------------------------------------------
export async function connectDB(): Promise<typeof mongoose> {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error(
      "MONGODB_URI is not defined. Add it to your .env.local file."
    );
  }

  // Return cached connection if already established
  if (cache.conn) {
    return cache.conn;
  }

  // If a connection attempt is already in flight, wait for it
  if (!cache.promise) {
    cache.promise = mongoose
      .connect(uri, {
        bufferCommands: false, // Fail fast instead of queuing commands
        maxPoolSize: 10,       // Max concurrent connections
      })
      .then((mongoose) => {
        // console.log("url", env.MONGODB_URI);
        console.log("✅ MongoDB connected successfully");
        return mongoose;
      });
  }

  try {
    cache.conn = await cache.promise;
  } catch (error) {
    // Reset promise so the next call retries the connection
    cache.promise = null;
    throw error;
  }

  return cache.conn;
}