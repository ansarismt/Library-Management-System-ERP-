import mongoose, { Document, Schema, Types } from "mongoose";

export const NOTIFICATION_TYPES = [
  "RESERVATION_READY", "RESERVATION_FULFILLED", "RESERVATION_CANCELLED", "RESERVATION_EXPIRED",
  "BOOK_ISSUED", "BOOK_RETURNED", "BOOK_DUE_SOON", "BOOK_OVERDUE",
  "FINE_CREATED", "FINE_PAID", "FINE_WAIVED",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export interface INotification extends Document {
  recipientUserId: Types.ObjectId;
  recipientMemberId?: Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  relatedResourceType?: string;
  relatedResourceId?: Types.ObjectId;
  isRead: boolean;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>({
  recipientUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  recipientMemberId: { type: Schema.Types.ObjectId, ref: "Member" },
  type: { type: String, enum: NOTIFICATION_TYPES, required: true },
  title: { type: String, required: true, trim: true, maxlength: 160 },
  message: { type: String, required: true, trim: true, maxlength: 1000 },
  relatedResourceType: { type: String, trim: true, maxlength: 50 },
  relatedResourceId: { type: Schema.Types.ObjectId },
  isRead: { type: Boolean, default: false, required: true },
  readAt: { type: Date },
}, { timestamps: true });

notificationSchema.index({ recipientUserId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ recipientUserId: 1, createdAt: -1 });
// One notification of an event type per recipient/resource prevents repeated API calls from duplicating events.
notificationSchema.index({ recipientUserId: 1, type: 1, relatedResourceId: 1 }, { unique: true, sparse: true });

const Notification = mongoose.models.Notification || mongoose.model<INotification>("Notification", notificationSchema);
export default Notification;
