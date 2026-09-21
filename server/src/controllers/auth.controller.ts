import { Request, Response } from "express";
import { findUserById } from "../repositories/user.repository.js";
import { Member } from "../models/Member.js";
import { User } from "../models/User.js";
import { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import {
  login,
  logout,
  refreshAccessToken,
  register,
  generateMemberId,
} from "../services/auth.service.js";
import { AUDIT_ACTIONS } from "../constants/auditActions.js";
import { auditRequest } from "../services/audit.service.js";

const isProduction = process.env.NODE_ENV === "production";
const sameSite: "lax" | "none" = isProduction ? "none" : "lax";

const refreshCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite,
  maxAge: 7 * 24 * 60 * 60 * 1000,
} as const;

export const registerController = async (
  req: Request,
  res: Response
) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are required",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must contain at least 8 characters",
      });
    }

    const user = await register({
      name,
      email,
      password,
    });

    await auditRequest(req, {
      action: AUDIT_ACTIONS.AUTH_REGISTER,
      resourceType: "AUTH",
      resourceId: user.id,
      description: "User registration succeeded",
      after: { userId: user.id, role: user.role },
      success: true,
      statusCode: 201,
    });

    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: user,
    });
  } catch (error) {
    await auditRequest(req, {
      action: AUDIT_ACTIONS.AUTH_REGISTER,
      resourceType: "AUTH",
      description: "User registration failed",
      metadata: { email: String(req.body.email ?? "").toLowerCase() },
      success: false,
      statusCode: 400,
    });

    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Registration failed",
    });
  }
};

export const loginController = async (
  req: Request,
  res: Response
) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const result = await login(email, password);

    await auditRequest(req, {
      actorUserId: result.user.id,
      actorRole: result.user.role,
      action: AUDIT_ACTIONS.AUTH_LOGIN,
      resourceType: "AUTH",
      resourceId: result.user.id,
      description: "User login succeeded",
      after: { userId: result.user.id, role: result.user.role },
      success: true,
      statusCode: 200,
    });

    res.cookie(
      "refreshToken",
      result.refreshToken,
      refreshCookieOptions
    );

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        user: result.user,
        accessToken: result.accessToken,
      },
    });
  } catch (error) {
    await auditRequest(req, {
      action: AUDIT_ACTIONS.AUTH_LOGIN_FAILED,
      resourceType: "AUTH",
      description: "User login failed",
      metadata: { email: String(req.body.email ?? "").toLowerCase() },
      success: false,
      statusCode: 401,
    });

    return res.status(401).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Login failed",
    });
  }
};

export const refreshController = async (
  req: Request,
  res: Response
) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: "Refresh token is missing",
      });
    }

    const result = await refreshAccessToken(refreshToken);

    await auditRequest(req, {
      action: AUDIT_ACTIONS.AUTH_REFRESH,
      resourceType: "AUTH",
      description: "Refresh token rotation succeeded",
      success: true,
      statusCode: 200,
    });

    res.cookie(
      "refreshToken",
      result.refreshToken,
      refreshCookieOptions
    );

    return res.status(200).json({
      success: true,
      data: {
        accessToken: result.accessToken,
      },
    });
  } catch {
    await auditRequest(req, {
      action: AUDIT_ACTIONS.AUTH_REFRESH,
      resourceType: "AUTH",
      description: "Refresh token rotation failed",
      success: false,
      statusCode: 401,
    });
    res.clearCookie("refreshToken");

    return res.status(401).json({
      success: false,
      message: "Invalid or expired refresh token",
    });
  }
};

export const logoutController = async (
  req: Request,
  res: Response
) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (refreshToken) {
      await logout(refreshToken);
    }

    await auditRequest(req, {
      action: AUDIT_ACTIONS.AUTH_LOGOUT,
      resourceType: "AUTH",
      description: "User logout succeeded",
      success: true,
      statusCode: 200,
    });

    res.clearCookie("refreshToken");

    return res.status(200).json({
      success: true,
      message: "Logout successful",
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Logout failed",
    });
  }
};

export const meController = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    const user = await findUserById(req.user.userId);

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    let linkedMemberId: string | undefined;

    /*
     * 1. If User already has a memberId,
     *    try to find the Member using that value.
     *    NOTE: user.memberId stores the Member._id (ObjectId), not the human-readable memberId field.
     */
    if (user.memberId) {
      const member = await Member.findById(user.memberId)
        .select("_id")
        .lean();

      if (member) {
        linkedMemberId = member._id.toString();
      }
    }

    /*
     * 2. If no memberId is stored on User,
     *    link the account using the same email.
     *
     *    User.email -> Member.email
     */
    if (!linkedMemberId && user.email) {
      const member = await Member.findOne({
        email: user.email.toLowerCase().trim(),
      })
        .select("_id")
        .lean();

      if (member) {
        linkedMemberId = member._id.toString();
      }
    }

    /*
     * 3. If still no Member found and user is a personal library member
     *    (STUDENT, FACULTY, or MEMBER), create a Member record.
     *    This handles existing users who registered before Member
     *    auto-creation was implemented.
     */
    if (
      !linkedMemberId &&
      user.email &&
      ["STUDENT", "FACULTY", "MEMBER"].includes(user.role)
    ) {
      const memberId = await generateMemberId();
      const membershipType = user.role as "STUDENT" | "FACULTY" | "MEMBER";
      const newMember = await Member.create({
        memberId,
        name: user.name,
        email: user.email.toLowerCase().trim(),
        membershipType,
        status: "ACTIVE",
        joinedAt: new Date(),
      });
      linkedMemberId = newMember._id.toString();

      // Link the Member to the User for future lookups
      await User.findByIdAndUpdate(user._id, {
        memberId: newMember._id,
      });
    }

    res.status(200).json({
      success: true,
      data: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,

        // IMPORTANT:
        // This is the MongoDB Member _id,
        // not the human-readable MEM001 value.
        memberId: linkedMemberId,
      },
    });
  } catch (error) {
    console.error("meController error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to get current user",
    });
  }
};