import { PaginationMetadata, PaginationQuery } from "../types/pagination.js";

export const getPaginationOptions = (query: PaginationQuery) => ({
  skip: (query.page - 1) * query.limit,
  limit: query.limit,
  sort: {
    [query.sort]: query.order === "asc" ? 1 : -1,
  } as Record<string, 1 | -1>,
});

export const createPaginationMetadata = (
  query: PaginationQuery,
  total: number
): PaginationMetadata => {
  const totalPages = Math.ceil(total / query.limit);

  return {
    page: query.page,
    limit: query.limit,
    total,
    totalPages,
    hasPreviousPage: query.page > 1,
    hasNextPage: query.page < totalPages,
  };
};
