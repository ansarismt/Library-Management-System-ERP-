import dotenv from "dotenv";
import mongoose from "mongoose";
import { connectDatabase } from "../config/database.js";
import { User } from "../models/User.js";
import { ROLES } from "../constants/roles.js";
import { hashPassword } from "../utils/password.js";

dotenv.config();

const bootstrapAdmin = async (): Promise<void> => {
  try {
    await connectDatabase();

    const email = "admin@test.com";
    const password = "Admin@12345";

    let user = await User.findOne({
      email: email.toLowerCase(),
    }).select("+passwordHash");

    if (!user) {
      const passwordHash = await hashPassword(password);

      user = await User.create({
        name: "System Administrator",
        email: email.toLowerCase(),
        passwordHash,
        role: ROLES.SUPER_ADMIN,
        status: "ACTIVE",
      });

      console.log("====================================");
      console.log("Admin user created successfully");
      console.log("Email:", user.email);
      console.log("Password:", password);
      console.log("Role:", user.role);
      console.log("Status:", user.status);
      console.log("====================================");
    } else {
      user.role = ROLES.SUPER_ADMIN;
      user.status = "ACTIVE";

      await user.save();

      console.log("====================================");
      console.log("Existing user promoted to admin");
      console.log("Email:", user.email);
      console.log("Role:", user.role);
      console.log("Status:", user.status);
      console.log("====================================");
    }
  } catch (error) {
    console.error("Admin bootstrap failed:", error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

bootstrapAdmin();