import { Request } from "express";
import {
  CreateAuditLogData,
  findAuditLogs,
  insertAuditLog,
} from "../repositories/audit.repository.js";
import { PaginationQuery } from "../types/pagination.js";

const SECRET_KEY = /(password|token|secret|cookie|authorization|credential|hash)/i;
const MAX_STRING_LENGTH = 1000;

const sanitizeValue = (value: unknown, depth = 0): unknown => {
  if (depth > 4) return "[TRUNCATED]";
  if (value === null || typeof value === "boolean" || typeof value === "number") return value;
  if (typeof value === "string") return value.slice(0, MAX_STRING_LENGTH);
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.slice(0, 50).map((item) => sanitizeValue(item, depth + 1));
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([key]) => !SECRET_KEY.test(key))
        .slice(0, 100)
        .map(([key, nested]) => [key, sanitizeValue(nested, depth + 1)])
    );
  }
  return undefined;
};

const sanitizeRecord = (value?: Record<string, unknown>) =>
  value ? sanitizeValue(value) as Record<string, unknown> : undefined;

export interface AuditRequestContext {
  actorUserId?: string;
  actorRole?: string;
  ipAddress?: string;
  userAgent?: string;
}

export const getAuditRequestContext = (
  req: Request
): AuditRequestContext => {
  const authenticated = (req as Request & { user?: { userId: string; role: string } }).user;
  return {
    actorUserId: authenticated?.userId,
    actorRole: authenticated?.role,
    ipAddress: req.ip,
    userAgent: req.get("user-agent")?.slice(0, MAX_STRING_LENGTH),
  };
};

export const createAuditLog = async (
  data: CreateAuditLogData
): Promise<void> => {
  try {
    await insertAuditLog({
      ...data,
      metadata: sanitizeRecord(data.metadata),
      before: sanitizeRecord(data.before),
      after: sanitizeRecord(data.after),
      description: data.description.slice(0, 500),
      ipAddress: data.ipAddress?.slice(0, 100),
      userAgent: data.userAgent?.slice(0, MAX_STRING_LENGTH),
    });
  } catch (error) {
    console.error("Audit log persistence failed:", error);
  }
};

export const auditRequest = async (
  req: Request,
  data: Omit<CreateAuditLogData, "ipAddress" | "userAgent">
): Promise<void> => createAuditLog({
  ...getAuditRequestContext(req),
  ...data,
});

export const listAuditLogs = (query: PaginationQuery & {
  action?: string;
  resourceType?: string;
  actorUserId?: string;
  success?: boolean;
}) => findAuditLogs(query);
