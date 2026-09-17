import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import {
  BookOpen,
  CalendarClock,
  Check,
  CircleDollarSign,
  Users,
  ArrowLeftRight,
  Settings,
  Bell,
  Circle,
  CreditCard,
} from "lucide-react";
import { notificationsApi, type Notification, type NotificationType } from "../api/services";
import { Button, Empty, Loading, PageHeader, Badge } from "../components/ui";
import { ErrorState } from "../components/ErrorState";
import { useNavigate } from "react-router-dom";

type FilterCategory = "all" | "unread" | "books" | "fines" | "members" | "circulation" | "system";

const CATEGORY_CONFIG: Record<FilterCategory, { label: string; icon: React.ElementType }> = {
  all: { label: "All", icon: Bell },
  unread: { label: "Unread", icon: Circle },
  books: { label: "Books", icon: BookOpen },
  fines: { label: "Fines", icon: CreditCard },
  members: { label: "Members", icon: Users },
  circulation: { label: "Circulation", icon: ArrowLeftRight },
  system: { label: "System", icon: Settings },
};

const BOOKS_TYPES: NotificationType[] = ["BOOK_ISSUED", "BOOK_RETURNED", "BOOK_RENEWED", "BOOK_DUE_SOON", "BOOK_OVERDUE", "BOOK_CREATED", "BOOK_UPDATED", "BOOK_DELETED", "BOOK_COPY_CREATED", "BOOK_COPY_UPDATED", "BOOK_COPY_DELETED", "BOOK_COPY_STATUS_CHANGED"];
const FINES_TYPES: NotificationType[] = ["FINE_CREATED", "FINE_PAID", "FINE_WAIVED"];
const MEMBERS_TYPES: NotificationType[] = ["MEMBER_CREATED", "MEMBER_UPDATED", "MEMBER_DELETED"];
const CIRCULATION_TYPES: NotificationType[] = [
  "RESERVATION_READY",
  "RESERVATION_FULFILLED",
  "RESERVATION_CANCELLED",
  "RESERVATION_EXPIRED",
  "RESERVATION_CREATED",
  "BOOK_ISSUED",
  "BOOK_RETURNED",
  "BOOK_RENEWED",
];
const SYSTEM_TYPES: NotificationType[] = ["BOOK_CREATED", "BOOK_UPDATED", "BOOK_DELETED", "BOOK_COPY_CREATED", "BOOK_COPY_UPDATED", "BOOK_COPY_DELETED", "BOOK_COPY_STATUS_CHANGED", "MEMBER_CREATED", "MEMBER_UPDATED", "MEMBER_DELETED"];

const getCategoryForType = (type: NotificationType): FilterCategory => {
  if (BOOKS_TYPES.includes(type)) return "books";
  if (FINES_TYPES.includes(type)) return "fines";
  if (MEMBERS_TYPES.includes(type)) return "members";
  if (CIRCULATION_TYPES.includes(type)) return "circulation";
  if (SYSTEM_TYPES.includes(type)) return "system";
  return "system";
};

const categoryFor = (type: NotificationType) => getCategoryForType(type);

const iconForType = (type: NotificationType) =>
  type.startsWith("RESERVATION")
    ? CalendarClock
    : type.startsWith("FINE")
    ? CircleDollarSign
    : type.startsWith("BOOK")
    ? BookOpen
    : type.startsWith("MEMBER")
    ? Users
    : Settings;

const destinationFor = (notification: Notification) =>
  notification.relatedResourceType === "RESERVATION"
    ? "/reservations"
    : notification.relatedResourceType === "FINE"
    ? "/fines"
    : notification.relatedResourceType === "ISSUE"
    ? "/circulation"
    : undefined;

const dateTime = (value: string) =>
  new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });

export default function Notifications() {
  const client = useQueryClient();
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState<FilterCategory>("all");

  const notifications = useQuery({
    queryKey: ["notifications", { limit: 100 }],
    queryFn: () => notificationsApi.list({ limit: 100 }),
  });

  const unreadQuery = useQuery({ queryKey: ["notification-unread-count"], queryFn: notificationsApi.unreadCount, refetchInterval: 60_000 });

  const filterCounts = useMemo(() => {
    const all = notifications.data?.data ?? [];
    return {
      all: all.length,
      unread: all.filter((n) => !n.isRead).length,
      books: all.filter((n) => categoryFor(n.type) === "books").length,
      fines: all.filter((n) => categoryFor(n.type) === "fines").length,
      members: all.filter((n) => categoryFor(n.type) === "members").length,
      circulation: all.filter((n) => categoryFor(n.type) === "circulation").length,
      system: all.filter((n) => categoryFor(n.type) === "system").length,
    };
  }, [notifications.data]);

  const filteredNotifications = useMemo(() => {
    const all = notifications.data?.data ?? [];
    switch (activeFilter) {
      case "unread":
        return all.filter((n) => !n.isRead);
      case "books":
        return all.filter((n) => categoryFor(n.type) === "books");
      case "fines":
        return all.filter((n) => categoryFor(n.type) === "fines");
      case "members":
        return all.filter((n) => categoryFor(n.type) === "members");
      case "circulation":
        return all.filter((n) => categoryFor(n.type) === "circulation");
      case "system":
        return all.filter((n) => categoryFor(n.type) === "system");
      default:
        return all;
    }
  }, [notifications.data, activeFilter]);

  const refresh = () =>
    Promise.all([
      client.invalidateQueries({ queryKey: ["notifications"] }),
      client.invalidateQueries({ queryKey: ["notification-unread-count"] }),
    ]);

  const markRead = useMutation({ mutationFn: notificationsApi.markRead, onSuccess: refresh });
  const markAll = useMutation({ mutationFn: notificationsApi.markAllRead, onSuccess: refresh });

  const activate = (notification: Notification) => {
    if (!notification.isRead) markRead.mutate(notification._id);
    const destination = destinationFor(notification);
    if (destination) navigate(destination);
  };

  const FilterButton = ({ category }: { category: FilterCategory }) => {
    const config = CATEGORY_CONFIG[category];
    const Icon = config.icon;
    const count = filterCounts[category];
    const isActive = activeFilter === category;
    return (
      <button
        type="button"
        className={`filter-btn flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
          isActive
            ? "bg-primary-50 text-primary-700 border border-primary-200"
            : "text-slate-600 hover:bg-slate-100"
        }`}
        onClick={() => setActiveFilter(category)}
      >
        <Icon size={14} />
        <span>{config.label}</span>
        <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{count}</span>
      </button>
    );
  };

  const getEmptyState = (category: FilterCategory) => {
    const messages: Record<FilterCategory, { title: string; text: string }> = {
      all: { title: "No notifications yet", text: "Updates about your library activity will appear here." },
      unread: { title: "No unread notifications", text: "You're all caught up!" },
      books: { title: "No book notifications", text: "Book-related updates will appear here." },
      fines: { title: "No fine notifications", text: "Fine and payment updates will appear here." },
      members: { title: "No member notifications", text: "Member-related updates will appear here." },
      circulation: { title: "No circulation notifications", text: "Loan and reservation updates will appear here." },
      system: { title: "No system notifications", text: "System updates will appear here." },
    };
    return messages[category];
  };

  return (
    <>
      <PageHeader
        title="Notifications"
        subtitle={`${unreadQuery.data?.count ?? 0} unread notification${unreadQuery.data?.count === 1 ? "" : "s"}`}
        action={
          <Button
            variant="secondary"
            disabled={!unreadQuery.data?.count || markAll.isPending}
            onClick={() => markAll.mutate()}
          >
            <Check size={16} /> Mark all as read
          </Button>
        }
      />

      <div className="filter-bar flex flex-wrap gap-2 mb-4" role="tablist" aria-label="Notification category filters">
        {(["all", "unread", "books", "fines", "members", "circulation", "system"] as FilterCategory[]).map((cat) => (
          <FilterButton key={cat} category={cat} />
        ))}
      </div>

      {notifications.isLoading ? (
        <Loading />
      ) : notifications.isError ? (
        <ErrorState error={notifications.error} onRetry={() => notifications.refetch()} />
      ) : filteredNotifications.length === 0 ? (
        (() => {
          const { title, text } = getEmptyState(activeFilter);
          return <Empty title={title} text={text} />;
        })()
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((notification) => {
            const Icon = iconForType(notification.type);
            const category = categoryFor(notification.type);
            const categoryConfig = CATEGORY_CONFIG[category];
            const CategoryIcon = categoryConfig.icon;
            return (
              <article
                key={notification._id}
                className={`card flex cursor-pointer gap-4 p-4 ${notification.isRead ? "opacity-70" : "border-l-4 border-l-blue-500 bg-blue-50/40"}`}
                onClick={() => activate(notification)}
              >
                <div className="rounded-full bg-slate-100 p-3">
                  <Icon size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{notification.title}</h3>
                        <Badge tone="outline">
                          <CategoryIcon size={10} />
                          {categoryConfig.label}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-slate-600">{notification.message}</p>
                    </div>
                    {!notification.isRead && (
                      <button
                        className="btn btn-ghost shrink-0"
                        aria-label="Mark as read"
                        onClick={(event) => {
                          event.stopPropagation();
                          markRead.mutate(notification._id);
                        }}
                      >
                        <Check size={16} /> Mark as read
                      </button>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-slate-500">{dateTime(notification.createdAt)}</p>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
