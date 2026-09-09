import mongoose, { Document, Schema } from "mongoose";
import { AuditAction, AuditResourceType } from "../constants/auditActions.js";

export interface IAuditLog extends Document {
  actorUserId?: mongoose.Types.ObjectId;
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
  createdAt: Date;
  updatedAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    actorUserId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    actorRole: { type: String, trim: true },
    action: { type: String, required: true, index: true },
    resourceType: { type: String, required: true, index: true },
    resourceId: { type: String, index: true },
    description: { type: String, required: true, trim: true, maxlength: 500 },
    metadata: { type: Schema.Types.Mixed },
    before: { type: Schema.Types.Mixed },
    after: { type: Schema.Types.Mixed },
    success: { type: Boolean, required: true, index: true },
    statusCode: { type: Number, min: 100, max: 599 },
    ipAddress: { type: String, trim: true, maxlength: 100 },
    userAgent: { type: String, trim: true, maxlength: 500 },
  },
  { timestamps: true }
);

auditLogSchema.index({ actorUserId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ resourceType: 1, resourceId: 1, createdAt: -1 });
auditLogSchema.index({ createdAt: -1 });

export const AuditLog = mongoose.model<IAuditLog>("AuditLog", auditLogSchema);
