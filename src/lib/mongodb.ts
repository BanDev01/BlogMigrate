import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI!;

if (!MONGODB_URI) {
  throw new Error("MONGODB_URI is not defined in environment variables");
}

declare global {
  var _mongooseConn: typeof mongoose | null;
}

let cached = global._mongooseConn;

if (!cached) {
  cached = global._mongooseConn = null;
}

export async function connectToDatabase() {
  if (cached) return cached;

  cached = await mongoose.connect(MONGODB_URI);
  global._mongooseConn = cached;
  return cached;
}
