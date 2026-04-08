import mongoose from "mongoose";
import { MONGODB_URI, NODE_ENV } from "../config/env.js";

if(!MONGODB_URI) {
    throw new Error("MONGODB_URI is not defined");
}

const connectToDatabase = async () => {
    try {
        const conn = await mongoose.connect(MONGODB_URI);
        console.log(`MongoDB connected to server ${conn.connection.host} in ${NODE_ENV} mode`);
    } catch (error) {
        console.log("MongoDB connection failed", error);
        process.exit(1);
    }
}

export default connectToDatabase;