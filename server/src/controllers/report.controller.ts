import { Request, Response, NextFunction } from "express";
import {
  getBooksReportService,
  getCirculationReportService,
  getFinesReportService,
  getMembersReportService,
  getReportSummaryService,
  getReservationsReportService,
} from "../services/report.service.js";

const getQuery = (req: Request) => req.query as {
  dateFrom?: string;
  dateTo?: string;
  status?: string;
  category?: string;
  bookId?: string;
  memberId?: string;
};

const sendReport = async (
  req: Request,
  res: Response,
  next: NextFunction,
  report: (query: ReturnType<typeof getQuery>) => Promise<unknown>
): Promise<void> => {
  try {
    const data = await report(getQuery(req));
    res.status(200).json({
      success: true,
      data,
      meta: {
        dateFrom: req.query.dateFrom ?? null,
        dateTo: req.query.dateTo ?? null,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const circulationReportController = (
  req: Request,
  res: Response,
  next: NextFunction
) => sendReport(req, res, next, getCirculationReportService);

export const booksReportController = (
  req: Request,
  res: Response,
  next: NextFunction
) => sendReport(req, res, next, getBooksReportService);

export const membersReportController = (
  req: Request,
  res: Response,
  next: NextFunction
) => sendReport(req, res, next, getMembersReportService);

export const finesReportController = (
  req: Request,
  res: Response,
  next: NextFunction
) => sendReport(req, res, next, getFinesReportService);

export const reservationsReportController = (
  req: Request,
  res: Response,
  next: NextFunction
) => sendReport(req, res, next, getReservationsReportService);

export const reportSummaryController = (
  req: Request,
  res: Response,
  next: NextFunction
) => sendReport(req, res, next, getReportSummaryService);
