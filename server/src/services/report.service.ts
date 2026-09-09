import {
  getBooksReport,
  getCirculationReport,
  getFinesReport,
  getMembersReport,
  getReservationsReport,
  getRecentDashboardActivity,
  ReportQuery,
} from "../repositories/report.repository.js";

export const getCirculationReportService = (query: ReportQuery) =>
  getCirculationReport(query);

export const getBooksReportService = (query: ReportQuery) =>
  getBooksReport(query);

export const getMembersReportService = (query: ReportQuery) =>
  getMembersReport(query);

export const getFinesReportService = (query: ReportQuery) =>
  getFinesReport(query);

export const getReservationsReportService = (query: ReportQuery) =>
  getReservationsReport(query);

export const getReportSummaryService = async (query: ReportQuery) => {
  const [circulation, books, members, fines, reservations] = await Promise.all([
    getCirculationReport(query),
    getBooksReport(query),
    getMembersReport(query),
    getFinesReport(query),
    getReservationsReport(query),
  ]);

  return {
    circulation,
    books,
    members,
    fines,
    reservations,
  };
};

export const getRecentDashboardActivityService = (
  query: ReportQuery
) => getRecentDashboardActivity(query);
