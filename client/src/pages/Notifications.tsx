import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, CalendarClock, Check, CircleDollarSign } from "lucide-react";
import { notificationsApi, type Notification } from "../api/services";
import { Button, Empty, Loading, PageHeader } from "../components/ui";
import { ErrorState } from "../components/ErrorState";
import { useNavigate } from "react-router-dom";

const iconFor = (type: Notification["type"]) => type.startsWith("RESERVATION") ? CalendarClock : type.startsWith("FINE") ? CircleDollarSign : BookOpen;
const destinationFor = (notification: Notification) => notification.relatedResourceType === "RESERVATION" ? "/reservations" : notification.relatedResourceType === "FINE" ? "/fines" : notification.relatedResourceType === "ISSUE" ? "/circulation" : undefined;
const dateTime = (value: string) => new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });

export default function Notifications() {
  const client = useQueryClient(); const navigate = useNavigate();
  const notifications = useQuery({ queryKey: ["notifications"], queryFn: () => notificationsApi.list({ limit: 100 }) });
  const unread = useQuery({ queryKey: ["notification-unread-count"], queryFn: notificationsApi.unreadCount });
  const refresh = () => Promise.all([client.invalidateQueries({ queryKey: ["notifications"] }), client.invalidateQueries({ queryKey: ["notification-unread-count"] })]);
  const markRead = useMutation({ mutationFn: notificationsApi.markRead, onSuccess: refresh });
  const markAll = useMutation({ mutationFn: notificationsApi.markAllRead, onSuccess: refresh });
  const activate = (notification: Notification) => { if (!notification.isRead) markRead.mutate(notification._id); const destination = destinationFor(notification); if (destination) navigate(destination); };
  return <>
    <PageHeader title="Notifications" subtitle={`${unread.data?.count ?? 0} unread notification${unread.data?.count === 1 ? "" : "s"}`} action={<Button variant="secondary" disabled={!unread.data?.count || markAll.isPending} onClick={() => markAll.mutate()}><Check size={16} /> Mark all as read</Button>} />
    {notifications.isLoading ? <Loading /> : notifications.isError ? <ErrorState error={notifications.error} onRetry={() => notifications.refetch()} /> : notifications.data?.data.length === 0 ? <Empty title="No notifications yet" text="Updates about your reservations, books, and fines will appear here." /> : <div className="space-y-3">
      {notifications.data?.data.map((notification) => { const Icon = iconFor(notification.type); return <article key={notification._id} className={`card flex cursor-pointer gap-4 p-4 ${notification.isRead ? "opacity-70" : "border-l-4 border-l-blue-500 bg-blue-50/40"}`} onClick={() => activate(notification)}>
        <div className="rounded-full bg-slate-100 p-3"><Icon size={20} /></div><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold">{notification.title}</h3><p className="mt-1 text-sm text-slate-600">{notification.message}</p></div>{!notification.isRead && <button className="btn btn-ghost shrink-0" aria-label="Mark as read" onClick={(event) => { event.stopPropagation(); markRead.mutate(notification._id); }}><Check size={16} /> Mark as read</button>}</div><p className="mt-2 text-xs text-slate-500">{dateTime(notification.createdAt)}</p></div>
      </article>; })}
    </div>}
  </>;
}
