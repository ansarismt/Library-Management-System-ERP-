import "dotenv/config";
import mongoose from "mongoose";
import { connectDatabase } from "../config/database.js";
import { User } from "../models/User.js";
import { ROLES } from "../constants/roles.js";
import { hashPassword } from "./password.js";

const resetAdminPassword = async (): Promise<void> => {
  try {
    await connectDatabase();

    const email = "admin@test.com";
    const newPassword = "Admin@123456";

    const user = await User.findOne({
      email: email.toLowerCase(),
    }).select("+passwordHash");

    if (!user) {
      console.error(`User not found: ${email}`);
      process.exitCode = 1;
      return;
    }

    user.passwordHash = await hashPassword(newPassword);
    user.role = ROLES.SUPER_ADMIN;
    user.status = "ACTIVE";

    await user.save();

    console.log("====================================");
    console.log("Admin password reset successful");
    console.log("Email:", user.email);
    console.log("Role:", user.role);
    console.log("Status:", user.status);
    console.log("====================================");
  } catch (error) {
    console.error("Password reset failed:", error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

resetAdminPassword();
