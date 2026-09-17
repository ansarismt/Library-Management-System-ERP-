import mongoose from "mongoose";
import { Member } from "../models/Member.js";
import { User } from "../models/User.js";
import { Issue } from "../models/Issue.js";
import { NotificationType } from "../models/Notification.js";
import { createNotification, getNotificationsByUser, getUnreadCountByUser, markAllNotificationsAsRead, markNotificationAsRead } from "../repositories/notification.repository.js";

export interface CreateNotificationData {
  recipientUserId: string;
  recipientMemberId?: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedResourceType?: string;
  relatedResourceId?: string;
}

export const createNotificationService = (data: CreateNotificationData) => createNotification(data);

const createDueDateNotificationsForUser = async (userId: string) => {
  const user = await User.findById(userId).select("memberId").exec();
  if (!user?.memberId) return;
  const member = await Member.findOne({ memberId: user.memberId }).select("_id").exec();
  if (!member) return;
  const now = new Date();
  const dueSoonEnd = new Date(now);
  dueSoonEnd.setDate(dueSoonEnd.getDate() + 3);
  const issues = await Issue.find({ memberId: member._id, status: "ISSUED", dueAt: { $lte: dueSoonEnd } }).populate("bookId", "title").exec();
  await Promise.all(issues.map((issue) => {
    const overdue = issue.dueAt < now;
    const title = typeof issue.bookId === "object" && "title" in issue.bookId ? (issue.bookId as unknown as { title?: string }).title ?? "Your book" : "Your book";
    return createNotification({ recipientUserId: userId, recipientMemberId: member._id.toString(),
      type: overdue ? "BOOK_OVERDUE" : "BOOK_DUE_SOON",
      title: overdue ? "Book overdue" : "Book due soon",
      message: overdue ? `"${title}" is overdue. Please return or renew it.` : `"${title}" is due within the next three days.`,
      relatedResourceType: "ISSUE", relatedResourceId: issue._id.toString() });
  }));
};

export const listNotificationsService = async (userId: string, query: { page?: number; limit?: number; unread?: boolean }) => {
  await createDueDateNotificationsForUser(userId);
  // query.unread is transformed by validator to boolean | undefined
  const unreadOnly = query.unread === true;
  return getNotificationsByUser(userId, query.page ?? 1, query.limit ?? 20, unreadOnly);
};

export const getUnreadCountService = async (userId: string) => {
  await createDueDateNotificationsForUser(userId);
  return getUnreadCountByUser(userId);
};

export const markNotificationReadService = async (id: string, userId: string) => {
  if (!mongoose.Types.ObjectId.isValid(id)) throw new Error("Invalid notification ID");
  const notification = await markNotificationAsRead(id, userId);
  if (!notification) throw new Error("Notification not found");
  return notification;
};

export const markAllNotificationsReadService = (userId: string) => markAllNotificationsAsRead(userId);

/** Resolve the recipient from trusted domain data; callers never provide a user id. */
export const notifyMember = async (memberId: unknown, event: Omit<CreateNotificationData, "recipientUserId" | "recipientMemberId">) => {
  const resolvedMemberId = typeof memberId === "object" && memberId !== null && "_id" in memberId
    ? String((memberId as { _id: unknown })._id)
    : String(memberId);
  if (!mongoose.Types.ObjectId.isValid(resolvedMemberId)) return null;
  const member = await Member.findById(resolvedMemberId).select("memberId").exec();
  if (!member) return null;
  const user = await User.findOne({ memberId: member.memberId }).select("_id").exec();
  if (!user) return null;
  return createNotification({ ...event, recipientUserId: user._id.toString(), recipientMemberId: resolvedMemberId });
};

/** Create notification for a member by their memberId, with automatic user resolution */
export const notifyMemberEvent = (memberId: unknown, type: NotificationType, title: string, message: string, relatedResourceType: string, relatedResourceId: string) =>
  notifyMember(memberId, { type, title, message, relatedResourceType, relatedResourceId });

/** Create notification for a user directly by userId (for admin/system notifications) */
export const notifyUserEvent = async (userId: string, type: NotificationType, title: string, message: string, relatedResourceType: string, relatedResourceId: string) => {
  if (!mongoose.Types.ObjectId.isValid(userId)) return null;
  const user = await User.findById(userId).select("_id").exec();
  if (!user) return null;
  return createNotification({ recipientUserId: userId, type, title, message, relatedResourceType, relatedResourceId });
};

/** Create notification for all admins (SUPER_ADMIN, LIBRARY_ADMIN, LIBRARIAN, ASSISTANT_LIBRARIAN) */
export const notifyAdmins = async (type: NotificationType, title: string, message: string, relatedResourceType: string, relatedResourceId: string) => {
  const admins = await User.find({ role: { $in: ["SUPER_ADMIN", "LIBRARY_ADMIN", "LIBRARIAN", "ASSISTANT_LIBRARIAN"] } }).select("_id").exec();
  await Promise.all(admins.map(admin => createNotification({ 
    recipientUserId: admin._id.toString(), 
    type, title, message, relatedResourceType, relatedResourceId 
  })));
};
