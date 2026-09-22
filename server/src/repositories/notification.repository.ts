import { Types } from "mongoose";
import Notification, { INotification, NotificationType } from "../models/Notification.js";

export interface CreateNotificationData {
  recipientUserId: string;
  recipientMemberId?: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedResourceType?: string;
  relatedResourceId?: string;
}

export const createNotification = async (data: CreateNotificationData): Promise<INotification> =>
  Notification.findOneAndUpdate(
    { recipientUserId: new Types.ObjectId(data.recipientUserId), type: data.type,
      ...(data.relatedResourceId ? { relatedResourceId: new Types.ObjectId(data.relatedResourceId) } : {}) },
    { $setOnInsert: { ...data, recipientUserId: new Types.ObjectId(data.recipientUserId),
      ...(data.recipientMemberId ? { recipientMemberId: new Types.ObjectId(data.recipientMemberId) } : {}),
      ...(data.relatedResourceId ? { relatedResourceId: new Types.ObjectId(data.relatedResourceId) } : {}) } },
    { returnDocument: "after", upsert: true, runValidators: true }
  ).exec();

export const refreshNotification = async (data: CreateNotificationData): Promise<INotification> =>
  Notification.findOneAndUpdate(
    { recipientUserId: new Types.ObjectId(data.recipientUserId), type: data.type,
      ...(data.relatedResourceId ? { relatedResourceId: new Types.ObjectId(data.relatedResourceId) } : {}) },
    { $set: { ...data, recipientUserId: new Types.ObjectId(data.recipientUserId),
        ...(data.recipientMemberId ? { recipientMemberId: new Types.ObjectId(data.recipientMemberId) } : {}),
        ...(data.relatedResourceId ? { relatedResourceId: new Types.ObjectId(data.relatedResourceId) } : {}),
      isRead: false }, $unset: { readAt: 1 } },
    { returnDocument: "after", upsert: true, runValidators: true }
  ).exec();

export const getNotificationsByUser = async (userId: string, page: number, limit: number, unreadOnly = false) => {
  const filter = { recipientUserId: new Types.ObjectId(userId), ...(unreadOnly ? { isRead: false } : {}) };
  const [items, total] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).exec(),
    Notification.countDocuments(filter).exec(),
  ]);
  return { items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
};
export const getUnreadCountByUser = (userId: string) => Notification.countDocuments({ recipientUserId: userId, isRead: false }).exec();
export const markNotificationAsRead = (id: string, userId: string) => Notification.findOneAndUpdate(
  { _id: id, recipientUserId: userId }, { $set: { isRead: true, readAt: new Date() } }, { returnDocument: "after" }
).exec();
export const markAllNotificationsAsRead = (userId: string) => Notification.updateMany(
  { recipientUserId: userId, isRead: false }, { $set: { isRead: true, readAt: new Date() } }
).exec();
