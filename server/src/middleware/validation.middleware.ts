import { NextFunction, Request, Response } from "express";
import { AppError } from "./error.middleware.js";

interface ValidationResult {
  success: boolean;
  data?: unknown;
  error?: {
    issues: Array<{
      path: PropertyKey[];
      message: string;
    }>;
  };
}

interface ValidationSchema {
  safeParse(input: unknown): ValidationResult;
}

type RequestPart = "body" | "params" | "query";

export const validate = (
  part: RequestPart,
  schema: ValidationSchema
) => {
  return (
    req: Request,
    _res: Response,
    next: NextFunction
  ): void => {
    const result = schema.safeParse(req[part]);

    if (!result.success) {
      next(new AppError(
        400,
        "Validation failed",
        result.error?.issues.map((issue) => ({
          field: issue.path.map(String).join("."),
          message: issue.message,
        }))
      ));
      return;
    }

    if (part === "body") {
      req.body = result.data;
    } else if (part === "params") {
      req.params = result.data as Request["params"];
    } else {
      Object.defineProperty(req, "query", {
        configurable: true,
        enumerable: true,
        value: result.data,
      });
    }

    next();
  };
};

export const validateBody = (schema: ValidationSchema) =>
  validate("body", schema);

export const validateParams = (schema: ValidationSchema) =>
  validate("params", schema);

export const validateQuery = (schema: ValidationSchema) =>
  validate("query", schema);
