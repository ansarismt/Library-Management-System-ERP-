import { NextFunction, Request, Response } from "express";
import { rateLimit } from "express-rate-limit";
import { AppError } from "./error.middleware.js";
import { AUDIT_ACTIONS } from "../constants/auditActions.js";
import {
  createAuditLog,
  getAuditRequestContext,
} from "../services/audit.service.js";

const readLimit = (name: string, fallback: number): number => {
  const value = Number(process.env[name]);
  return Number.isInteger(value) && value > 0 ? value : fallback;
};

const readWindow = (name: string, fallback: number): number => {
  const value = Number(process.env[name]);
  return Number.isInteger(value) && value > 0 ? value : fallback;
};

const rateLimitHandler = (
  scope: string,
  auditSecurityEvent = false
) => (req: Request, _res: Response, next: NextFunction): void => {
  if (auditSecurityEvent) {
    void createAuditLog({
      ...getAuditRequestContext(req),
      action: AUDIT_ACTIONS.AUTH_ACCESS_DENIED,
      resourceType: "AUTH",
      description: `Rate limit exceeded for ${scope}`,
      metadata: { scope },
      success: false,
      statusCode: 429,
    });
  }

  next(new AppError(429, "Too many requests. Please try again later."));
};

const createLimiter = (
  windowMs: number,
  max: number,
  scope: string,
  auditSecurityEvent = false
) => rateLimit({
  windowMs,
  limit: max,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: rateLimitHandler(scope, auditSecurityEvent),
});

export const authLimiter = createLimiter(
  readWindow("AUTH_RATE_LIMIT_WINDOW_MS", 15 * 60 * 1000),
  readLimit("AUTH_RATE_LIMIT_MAX", 20),
  "authentication",
  true
);

export const registrationLimiter = createLimiter(
  readWindow("REGISTRATION_RATE_LIMIT_WINDOW_MS", 60 * 60 * 1000),
  readLimit("REGISTRATION_RATE_LIMIT_MAX", 10),
  "registration",
  true
);

export const refreshLimiter = createLimiter(
  readWindow("REFRESH_RATE_LIMIT_WINDOW_MS", 15 * 60 * 1000),
  readLimit("REFRESH_RATE_LIMIT_MAX", 30),
  "refresh",
  true
);

export const apiLimiter = createLimiter(
  readWindow("API_RATE_LIMIT_WINDOW_MS", 15 * 60 * 1000),
  readLimit("API_RATE_LIMIT_MAX", 300),
  "api"
);

export const sensitiveMutationLimiter = createLimiter(
  readWindow("SENSITIVE_RATE_LIMIT_WINDOW_MS", 15 * 60 * 1000),
  readLimit("SENSITIVE_RATE_LIMIT_MAX", 60),
  "sensitive-mutation"
);
