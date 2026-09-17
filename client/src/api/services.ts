import { api, unwrap } from "./client";
import type {
  ApiResponse,
  Book,
  BookCopy,
  Fine,
  Issue,
  Member,
  User,
} from "../types";

export const authApi = {
  login: (body: { email: string; password: string }) =>
    api.post<ApiResponse<{ user: User; accessToken: string }>>(
      "/auth/login",
      body,
    ),
  register: (body: { name: string; email: string; password: string }) =>
    api.post<ApiResponse<User>>("/auth/register", body),
  refresh: () =>
    api.post<ApiResponse<{ accessToken: string }>>("/auth/refresh", {}),
  me: () => unwrap<User>(api.get<ApiResponse<User>>("/auth/me")),
  logout: () => api.post("/auth/logout", {}),
};
export const booksApi = {
  list: () => unwrap<Book[]>(api.get<ApiResponse<Book[]>>("/books")),
  get: (id: string) => unwrap<Book>(api.get<ApiResponse<Book>>(`/books/${id}`)),
  byIsbn: (isbn: string) =>
    unwrap<Book>(
      api.get<ApiResponse<Book>>(`/books/isbn/${encodeURIComponent(isbn)}`),
    ),
  create: (body: Partial<Book>) =>
    unwrap<Book>(api.post<ApiResponse<Book>>("/books", body)),
  update: (id: string, body: Partial<Book>) =>
    unwrap<Book>(api.patch<ApiResponse<Book>>(`/books/${id}`, body)),
  remove: (id: string) => api.delete(`/books/${id}`),
};
export const copiesApi = {
  list: () =>
    unwrap<BookCopy[]>(api.get<ApiResponse<BookCopy[]>>("/book-copies")),
  byBook: (id: string) =>
    unwrap<BookCopy[]>(
      api.get<ApiResponse<BookCopy[]>>(`/book-copies/book/${id}`),
    ),
  create: (
    body: Partial<BookCopy> & { bookId: string; accessionNumber: string },
  ) => unwrap<BookCopy>(api.post<ApiResponse<BookCopy>>("/book-copies", body)),
  update: (id: string, body: Partial<BookCopy>) =>
    unwrap<BookCopy>(
      api.patch<ApiResponse<BookCopy>>(`/book-copies/${id}`, body),
    ),
  remove: (id: string) => api.delete(`/book-copies/${id}`),
};
export const membersApi = {
  list: () => unwrap<Member[]>(api.get<ApiResponse<Member[]>>("/members")),
  get: (id: string) =>
    unwrap<Member>(api.get<ApiResponse<Member>>(`/members/${id}`)),
  create: (body: Partial<Member>) =>
    unwrap<Member>(api.post<ApiResponse<Member>>("/members", body)),
  update: (id: string, body: Partial<Member>) =>
    unwrap<Member>(api.patch<ApiResponse<Member>>(`/members/${id}`, body)),
  remove: (id: string) => api.delete(`/members/${id}`),
};
export const issuesApi = {
  list: () => unwrap<Issue[]>(api.get<ApiResponse<Issue[]>>("/issues")),
  byMember: (id: string) =>
    unwrap<Issue[]>(api.get<ApiResponse<Issue[]>>(`/issues/member/${id}`)),
  create: (body: Record<string, unknown>) =>
    unwrap<Issue>(api.post<ApiResponse<Issue>>("/issues", body)),
  update: (id: string, body: Record<string, unknown>) =>
    unwrap<Issue>(api.patch<ApiResponse<Issue>>(`/issues/${id}`, body)),
  return: (id: string, body: { returnedBy: string; notes?: string }) =>
    unwrap<Issue>(api.post<ApiResponse<Issue>>(`/issues/${id}/return`, body)),
  renew: (id: string, body: { additionalDays?: number; dueAt?: string }) =>
    unwrap<Issue>(api.post<ApiResponse<Issue>>(`/issues/${id}/renew`, body)),
  remove: (id: string) => api.delete(`/issues/${id}`),
};
export const finesApi = {
  list: () => unwrap<Fine[]>(api.get<ApiResponse<Fine[]>>("/fines")),
  byMember: (id: string) =>
    unwrap<Fine[]>(api.get<ApiResponse<Fine[]>>(`/fines/member/${id}`)),
  calculate: (issueId: string) =>
    unwrap<Fine>(api.post<ApiResponse<Fine>>(`/fines/calculate/${issueId}`)),
  pay: (
    id: string,
    body: { amount: number; paymentMethod: string; paidBy: string },
  ) => unwrap<Fine>(api.post<ApiResponse<Fine>>(`/fines/${id}/pay`, body)),
  waive: (id: string, body: { waivedBy: string; reason: string }) =>
    unwrap<Fine>(api.post<ApiResponse<Fine>>(`/fines/${id}/waive`, body)),
  remove: (id: string) => api.delete(`/fines/${id}`),
};
export interface Reservation {
  _id: string;

  bookId:
    | string
    | {
        _id: string;
        title?: string;
        isbn?: string;
      };

  memberId:
    | string
    | {
        _id: string;
        name?: string;
        memberId?: string;
      };

  reservedAt: string;
  expiresAt?: string;
  fulfilledAt?: string;
  cancelledAt?: string;

  status:
    | "WAITING"
    | "READY"
    | "FULFILLED"
    | "CANCELLED"
    | "EXPIRED";

  queuePosition?: number;
  notes?: string;

  createdAt: string;
  updatedAt: string;
}

export const reservationsApi = {
  // Get all reservations
  list: () =>
    unwrap<Reservation[]>(
      api.get<ApiResponse<Reservation[]>>("/reservations"),
    ),

  // Get reservations for one member
  byMember: (memberId: string) =>
    unwrap<Reservation[]>(
      api.get<ApiResponse<Reservation[]>>(
        `/reservations/member/${memberId}`,
      ),
    ),

  // Get reservations for one book
  byBook: (bookId: string) =>
    unwrap<Reservation[]>(
      api.get<ApiResponse<Reservation[]>>(
        `/reservations/book/${bookId}`,
      ),
    ),

  // Create reservation
  create: (body: {
    bookId: string;
    memberId: string;
    expiresAt?: string;
    notes?: string;
  }) =>
    unwrap<Reservation>(
      api.post<ApiResponse<Reservation>>(
        "/reservations",
        body,
      ),
    ),

  // Update reservation
  update: (
    id: string,
    body: {
      expiresAt?: string;
      notes?: string;
    },
  ) =>
    unwrap<Reservation>(
      api.patch<ApiResponse<Reservation>>(
        `/reservations/${id}`,
        body,
      ),
    ),

  // Cancel reservation
  cancel: (id: string) =>
    unwrap<Reservation>(
      api.patch<ApiResponse<Reservation>>(
        `/reservations/${id}/cancel`,
        {},
      ),
    ),

  // Mark WAITING reservation as READY
  ready: (id: string) =>
    unwrap<Reservation>(
      api.patch<ApiResponse<Reservation>>(
        `/reservations/${id}/ready`,
        {},
      ),
    ),

  // Fulfill READY reservation and create the issue
  fulfill: (
    id: string,
    body: {
      dueAt: string;
      notes?: string;
    },
  ) =>
    unwrap<Reservation>(
      api.patch<ApiResponse<Reservation>>(
        `/reservations/${id}/fulfill`,
        body,
      ),
    ),

  // Expire reservation
  expire: (id: string) =>
    unwrap<Reservation>(
      api.patch<ApiResponse<Reservation>>(
        `/reservations/${id}/expire`,
        {},
      ),
    ),

  // Delete reservation
  remove: (id: string) =>
    api.delete(`/reservations/${id}`),
};
export const usersApi = {
  list: () => unwrap<User[]>(api.get<ApiResponse<User[]>>("/users")),
  get: (id: string) => unwrap<User>(api.get<ApiResponse<User>>(`/users/${id}`)),
  create: (body: Record<string, unknown>) =>
    unwrap<User>(api.post<ApiResponse<User>>("/users", body)),
  update: (id: string, body: Record<string, unknown>) =>
    unwrap<User>(api.patch<ApiResponse<User>>(`/users/${id}`, body)),
  remove: (id: string) => api.delete(`/users/${id}`),
  role: (id: string, role: string) =>
    unwrap<User>(api.patch<ApiResponse<User>>(`/users/${id}/role`, { role })),
};

export interface AuditLog {
  _id: string;
  actorUserId?: {
    _id: string;
    name: string;
    email: string;
    role: string;
  };
  actorRole?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  description: string;
  metadata?: Record<string, unknown>;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  success: boolean;
  statusCode?: number;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface AuditLogsResponse {
  success: boolean;
  data: AuditLog[];
  pagination: AuditPagination;
}

export const auditApi = {
  list: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    action?: string;
    resourceType?: string;
    actorUserId?: string;
    success?: "true" | "false";
    dateFrom?: string;
    dateTo?: string;
    sort?: "createdAt" | "action" | "resourceType" | "success";
    order?: "asc" | "desc";
  }) => {
    const response = await api.get<AuditLogsResponse>("/audit-logs", {
      params,
    });

    return response.data;
  },
};

export type NotificationType =
  | "RESERVATION_READY" | "RESERVATION_FULFILLED" | "RESERVATION_CANCELLED" | "RESERVATION_EXPIRED" | "RESERVATION_CREATED"
  | "BOOK_ISSUED" | "BOOK_RETURNED" | "BOOK_RENEWED" | "BOOK_DUE_SOON" | "BOOK_OVERDUE" | "BOOK_CREATED" | "BOOK_UPDATED" | "BOOK_DELETED"
  | "BOOK_COPY_CREATED" | "BOOK_COPY_UPDATED" | "BOOK_COPY_DELETED" | "BOOK_COPY_STATUS_CHANGED"
  | "FINE_CREATED" | "FINE_PAID" | "FINE_WAIVED"
  | "MEMBER_CREATED" | "MEMBER_UPDATED" | "MEMBER_DELETED";
export interface Notification {
  _id: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedResourceType?: string;
  relatedResourceId?: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
  updatedAt: string;
}
export interface NotificationsResponse { success: boolean; data: Notification[]; pagination: { page: number; limit: number; total: number; totalPages: number }; }
export const notificationsApi = {
  list: async (params?: { page?: number; limit?: number; unread?: boolean }) => (await api.get<NotificationsResponse>("/notifications", { params })).data,
  unreadCount: () => unwrap<{ count: number }>(api.get<ApiResponse<{ count: number }>>("/notifications/unread-count")),
  markRead: (id: string) => unwrap<Notification>(api.patch<ApiResponse<Notification>>(`/notifications/${id}/read`)),
  markAllRead: () => unwrap<{ modifiedCount: number }>(api.patch<ApiResponse<{ modifiedCount: number }>>("/notifications/read-all")),
};

export type LibrarySettings = {
  key: string;

  library: {
    libraryName: string;
    address: string;
    phone: string;
    email: string;
  };

  circulation: {
    defaultLoanDays: number;
    maxBooksPerMember: number;
    renewalLimit: number;
    finePerDay: number;
  };

  reservations: {
    enabled: boolean;
    holdDays: number;
  };

  notifications: {
    dueSoonEnabled: boolean;
    overdueEnabled: boolean;
    reservationReadyEnabled: boolean;
    fineEnabled: boolean;
  };

  system: {
    timezone: string;
  };

  createdAt?: string;
  updatedAt?: string;
};

export type SettingsUpdate = {
  library?: Partial<LibrarySettings["library"]>;
  circulation?: Partial<LibrarySettings["circulation"]>;
  reservations?: Partial<LibrarySettings["reservations"]>;
  notifications?: Partial<LibrarySettings["notifications"]>;
  system?: Partial<LibrarySettings["system"]>;
};

export const settingsApi = {
  get: () =>
    api.get<{ success: boolean; data: LibrarySettings }>(
      "/settings",
    ),

  update: (updates: SettingsUpdate) =>
    api.patch<{ success: boolean; data: LibrarySettings }>(
      "/settings",
      updates,
    ),
};
