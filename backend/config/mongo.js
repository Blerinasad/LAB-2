import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

export const connectMongo = async () => {
  await mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 3000,
    connectTimeoutMS: 3000,
  });
  console.log("MongoDB connected");
};
