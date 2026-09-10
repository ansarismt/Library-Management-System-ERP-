import { NextFunction, Request, Response } from "express";
import { getDashboardSummaryService } from "../services/dashboard.service.js";

export const dashboardSummaryController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const data = await getDashboardSummaryService(req.query);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};