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
