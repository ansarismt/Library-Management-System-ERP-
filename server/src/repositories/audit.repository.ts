import mongoose from "mongoose";
import { AuditAction, AuditResourceType } from "../constants/auditActions.js";
import { AuditLog, IAuditLog } from "../models/AuditLog.js";
import { PaginatedResult, PaginationQuery } from "../types/pagination.js";
import { createPaginationMetadata, getPaginationOptions } from "../utils/pagination.js";
import { escapeRegex } from "../utils/search.js";

export interface CreateAuditLogData {
  actorUserId?: string;
  actorRole?: string;
  action: AuditAction;
  resourceType: AuditResourceType;
  resourceId?: string;
  description: string;
  metadata?: Record<string, unknown>;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  success: boolean;
  statusCode?: number;
  ipAddress?: string;
  userAgent?: string;
}

export const insertAuditLog = async (
  data: CreateAuditLogData
): Promise<IAuditLog> => AuditLog.create({
  ...data,
  actorUserId: data.actorUserId
    ? new mongoose.Types.ObjectId(data.actorUserId)
    : undefined,
});

export const findAuditLogs = async (
  query: PaginationQuery & {
    action?: string;
    resourceType?: string;
    actorUserId?: string;
    success?: boolean;
  }
): Promise<PaginatedResult<IAuditLog>> => {
  const filters: Record<string, unknown> = {};

  if (query.search) {
    const search = new RegExp(escapeRegex(query.search), "i");
    filters.$or = [
      { description: search },
      { action: search },
      { resourceType: search },
    ];
  }
  if (query.action) filters.action = query.action;
  if (query.resourceType) filters.resourceType = query.resourceType;
  if (query.actorUserId) {
    filters.actorUserId = new mongoose.Types.ObjectId(query.actorUserId);
  }
  if (query.success !== undefined) filters.success = query.success;
  if (query.dateFrom || query.dateTo) {
    filters.createdAt = {
      ...(query.dateFrom ? { $gte: new Date(query.dateFrom) } : {}),
      ...(query.dateTo ? { $lte: new Date(query.dateTo) } : {}),
    };
  }

  const { skip, limit, sort } = getPaginationOptions(query);
  const [items, total] = await Promise.all([
    AuditLog.find(filters)
      .populate("actorUserId", "name email role")
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .exec(),
    AuditLog.countDocuments(filters).exec(),
  ]);

  return {
    items,
    pagination: createPaginationMetadata(query, total),
  };
};
