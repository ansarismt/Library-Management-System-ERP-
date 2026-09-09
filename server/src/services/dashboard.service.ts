import {
  getRecentDashboardActivityService,
  getReportSummaryService,
} from "./report.service.js";
import { ReportQuery } from "../repositories/report.repository.js";

const getStatusCount = (
  statuses: Array<{ status: string; count: number }>,
  status: string
): number => statuses.find((item) => item.status === status)?.count ?? 0;

export const getDashboardSummaryService = async (
  query: ReportQuery
) => {
  const [reports, recent] = await Promise.all([
    getReportSummaryService(query),
    getRecentDashboardActivityService(query),
  ]);

  return {
    kpis: {
      totalBooks: reports.books.totals.totalBooks ?? 0,
      totalBookCopies: reports.books.totals.totalCopies ?? 0,
      availableCopies: reports.books.totals.availableCopies ?? 0,
      issuedCopies: reports.books.copies.issuedCopies ?? 0,
      activeMembers: reports.members.totals.activeMembers ?? 0,
      activeIssues: reports.circulation.totals.currentlyIssued ?? 0,
      overdueIssues: reports.circulation.totals.overdue ?? 0,
      outstandingFines: reports.fines.totals.outstandingAmount ?? 0,
      waitingReservations: getStatusCount(reports.reservations.statuses, "WAITING"),
      readyReservations: getStatusCount(reports.reservations.statuses, "READY"),
    },
    recentCirculation: recent.circulation,
    recentReservations: recent.reservations,
    trends: {
      circulation: reports.circulation.trends,
      fines: reports.fines.trend,
      reservations: reports.reservations.trend,
    },
    metadata: {
      dateFrom: query.dateFrom ?? null,
      dateTo: query.dateTo ?? null,
      generatedAt: new Date().toISOString(),
    },
  };
};