import { Request, Response, NextFunction } from "express";
import { listAuditLogs } from "../services/audit.service.js";

export const listAuditLogsController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await listAuditLogs(req.query as never);
    res.status(200).json({
      success: true,
      data: result.items,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};
