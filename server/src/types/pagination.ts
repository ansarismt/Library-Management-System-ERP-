export interface PaginationQuery {
  page: number;
  limit: number;
  sort: string;
  order: "asc" | "desc";
  search?: string;
  role?: string;
  status?: string;
  category?: string;
  condition?: string;
  membershipType?: string;
  paymentMethod?: string;
  bookId?: string;
  memberId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface PaginationMetadata {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface PaginatedResult<T> {
  items: T[];
  pagination: PaginationMetadata;
}
