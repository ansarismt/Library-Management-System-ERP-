export type Role =
  | "SUPER_ADMIN"
  | "LIBRARY_ADMIN"
  | "LIBRARIAN"
  | "ASSISTANT_LIBRARIAN"
  | "FACULTY"
  | "STUDENT"
  | "MEMBER"
  | "AUDITOR";

export type Permission =
  | "USER_CREATE"
  | "USER_READ"
  | "USER_UPDATE"
  | "USER_DELETE"
  | "USER_MANAGE_ROLES"
  | "BOOK_CREATE"
  | "BOOK_READ"
  | "BOOK_UPDATE"
  | "BOOK_DELETE"
  | "BOOK_COPY_CREATE"
  | "BOOK_COPY_READ"
  | "BOOK_COPY_UPDATE"
  | "BOOK_COPY_DELETE"
  | "MEMBER_CREATE"
  | "MEMBER_READ"
  | "MEMBER_UPDATE"
  | "MEMBER_DELETE"
  | "BOOK_ISSUE"
  | "BOOK_RETURN"
  | "BOOK_RENEW"
  | "RESERVATION_CREATE"
  | "RESERVATION_READ"
  | "RESERVATION_UPDATE"
  | "RESERVATION_CANCEL"
  | "FINE_CREATE"
  | "FINE_READ"
  | "FINE_UPDATE"
  | "FINE_WAIVE"
  | "REPORT_VIEW"
  | "REPORT_EXPORT"
  | "LIBRARY_SETTINGS"
  | "AUDIT_LOG_VIEW";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  memberId?: string;
  department?: string;
  lastLogin?: string;
}
export interface Book {
  _id: string;
  isbn: string;
  title: string;
  subtitle?: string;
  authors: string[];
  publisher?: string;
  publicationYear?: number;
  edition?: string;
  category?: string;
  language?: string;
  description?: string;
  coverImage?: string;
  totalCopies: number;
  availableCopies: number;
  status: "ACTIVE" | "INACTIVE" | "ARCHIVED";
}
export interface BookCopy {
  _id: string;
  bookId: string | Pick<Book, "_id" | "isbn" | "title" | "authors">;
  accessionNumber: string;
  barcode?: string;
  location?: string;
  status:
    "AVAILABLE" | "ISSUED" | "RESERVED" | "LOST" | "DAMAGED" | "MAINTENANCE";
  condition: "NEW" | "GOOD" | "FAIR" | "POOR";
  acquiredAt?: string;
  price?: number;
  notes?: string;
}
export interface Member {
  _id: string;
  memberId: string;
  name: string;
  email: string;
  phone?: string;
  department?: string;
  course?: string;
  year?: number;
  membershipType: "STUDENT" | "FACULTY" | "STAFF" | "GUEST";
  status: "ACTIVE" | "SUSPENDED" | "EXPIRED" | "INACTIVE";
  joinedAt: string;
  expiryDate?: string;
}
export interface Issue {
  _id: string;
  bookId: Book | string;
  bookCopyId: BookCopy | string;
  memberId: Member | string;
  issuedBy: User | string;
  issuedAt: string;
  dueAt: string;
  returnedAt?: string;
  returnedBy?: User | string;
  status: "ISSUED" | "RETURNED" | "OVERDUE" | "LOST";
  renewalCount: number;
  notes?: string;
}
export interface Fine {
  _id: string;
  issueId: Issue | string;
  memberId: Member | string;
  bookId: Book | string;
  amount: number;
  paidAmount: number;
  daysOverdue: number;
  ratePerDay: number;
  status: "UNPAID" | "PAID" | "WAIVED" | "PARTIAL";
  paymentMethod?: "CASH" | "CARD" | "UPI" | "BANK_TRANSFER" | "ONLINE";
  paidAt?: string;
  paidBy?: User | string;
  waivedAt?: string;
  waivedBy?: User | string;
  waiverReason?: string;
  notes?: string;
}

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
export type ApiResponse<T> = { success: boolean; message?: string; data: T };
