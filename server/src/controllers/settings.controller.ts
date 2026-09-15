import { Request, Response, NextFunction } from "express";
import {
  getSettingsService,
  updateSettingsService,
} from "../services/settings.service.js";
import { SettingsUpdate } from "../repositories/settings.repository.js";

export const getSettingsController = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const settings = await getSettingsService();

    res.status(200).json({
      success: true,
      data: settings,
    });
  } catch (error) {
    next(error);
  }
};

export const updateSettingsController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const settings = await updateSettingsService(
      req.body as SettingsUpdate,
    );

    res.status(200).json({
      success: true,
      data: settings,
    });
  } catch (error) {
    next(error);
  }
};