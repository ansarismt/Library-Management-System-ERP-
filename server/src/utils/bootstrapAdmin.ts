import dotenv from "dotenv";
import mongoose from "mongoose";
import { connectDatabase } from "../config/database.js";
import { User } from "../models/User.js";
import { ROLES } from "../constants/roles.js";

dotenv.config();

const bootstrapAdmin = async (): Promise<void> => {
  try {
    await connectDatabase();

    const email = "admin@test.com";

    const user = await User.findOne({
      email: email.toLowerCase(),
    });

    if (!user) {
      console.error(`User not found: ${email}`);
      process.exitCode = 1;
      return;
    }

    user.role = ROLES.SUPER_ADMIN;
    user.status = "ACTIVE";

    await user.save();

    console.log("====================================");
    console.log("Admin bootstrap successful");
    console.log("Email:", user.email);
    console.log("Role:", user.role);
    console.log("Status:", user.status);
    console.log("====================================");
  } catch (error) {
    console.error("Admin bootstrap failed:", error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

bootstrapAdmin();