import { ErrorRequestHandler, NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";

export class AppError extends Error {
  readonly statusCode: number;
  readonly details?: unknown;

  constructor(
    statusCode: number,
    message: string,
    details?: unknown
  ) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.details = details;
  }
}

export const notFoundHandler = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  next(new AppError(404, `Route not found: ${req.method} ${req.path}`));
};

const isDuplicateKeyError = (
  error: unknown
): error is { code: 11000; keyPattern?: Record<string, unknown> } =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  error.code === 11000;

const getDuplicateField = (
  error: { keyPattern?: Record<string, unknown> }
): string | undefined => {
  const field = error.keyPattern
    ? Object.keys(error.keyPattern)[0]
    : undefined;

  return field;
};

const getValidationDetails = (
  error: mongoose.Error.ValidationError
) => Object.values(error.errors).map((validationError) => ({
  field: validationError.path,
  message: validationError.message,
}));

export const errorHandler: ErrorRequestHandler = (
  error: unknown,
  _req,
  res,
  next
): void => {
  if (res.headersSent) {
    next(error);
    return;
  }

  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      success: false,
      message: error.message,
      ...(error.details ? { errors: error.details } : {}),
    });
    return;
  }

  if (error instanceof mongoose.Error.ValidationError) {
    res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: getValidationDetails(error),
    });
    return;
  }

  if (error instanceof mongoose.Error.CastError) {
    res.status(400).json({
      success: false,
      message: "Invalid resource identifier",
    });
    return;
  }

  if (isDuplicateKeyError(error)) {
    const field = getDuplicateField(error);
    res.status(409).json({
      success: false,
      message: field
        ? `A resource with this ${field} already exists`
        : "A resource with these values already exists",
    });
    return;
  }

  if (
    error instanceof jwt.JsonWebTokenError ||
    error instanceof jwt.TokenExpiredError ||
    error instanceof jwt.NotBeforeError
  ) {
    res.status(401).json({
      success: false,
      message: "Invalid or expired access token",
    });
    return;
  }

  if (
    error instanceof SyntaxError &&
    "body" in error
  ) {
    res.status(400).json({
      success: false,
      message: "Invalid JSON request body",
    });
    return;
  }

  console.error("Unhandled request error:", error);

  res.status(500).json({
    success: false,
    message: "Internal server error",
  });
};
