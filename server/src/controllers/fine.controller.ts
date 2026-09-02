import {
  Request,
  Response,
} from "express";

import {
  listFinesService,
  getFineService,
  listMemberFinesService,
  calculateFineService,
  payFineService,
  waiveFineService,
  deleteFineService,
} from "../services/fine.service.js";


/* =========================================================
   LIST FINES
========================================================= */

export const listFinesController =
  async (
    _req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const fines =
        await listFinesService();

      res.status(200).json({
        success: true,
        data: fines,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to fetch fines",
      });
    }
  };


/* =========================================================
   GET FINE
========================================================= */

export const getFineController =
  async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { id } = req.params;

if (typeof id !== "string") {
  res.status(400).json({
    success: false,
    message: "Invalid fine ID",
  });
  return;
}

      const fine =
        await getFineService(id);

      res.status(200).json({
        success: true,
        data: fine,
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Fine not found",
      });
    }
  };


/* =========================================================
   MEMBER FINES
========================================================= */

export const getMemberFinesController =
  async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { memberId } = req.params;

if (typeof memberId !== "string") {
  res.status(400).json({
    success: false,
    message: "Invalid member ID",
  });
  return;
}

      const fines =
        await listMemberFinesService(
          memberId
        );

      res.status(200).json({
        success: true,
        data: fines,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to fetch member fines",
      });
    }
  };


/* =========================================================
   CALCULATE FINE
========================================================= */

export const calculateFineController =
  async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { issueId } = req.params;

if (typeof issueId !== "string") {
  res.status(400).json({
    success: false,
    message: "Invalid issue ID",
  });
  return;
}
      const fine =
        await calculateFineService(
          issueId
        );

      res.status(201).json({
        success: true,
        message:
          "Fine calculated successfully",
        data: fine,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to calculate fine",
      });
    }
  };


/* =========================================================
   PAY FINE
========================================================= */

export const payFineController =
  async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const id =
  typeof req.params.id === "string"
    ? req.params.id
    : undefined;

if (!id) {
  res.status(400).json({
    success: false,
    message: "Invalid fine ID",
  });
  return;
}
      const {
        amount,
        paymentMethod,
        paidBy,
      } = req.body;

      if (
        amount === undefined
      ) {
        res.status(400).json({
          success: false,
          message:
            "amount is required",
        });
        return;
      }

      if (!paymentMethod) {
        res.status(400).json({
          success: false,
          message:
            "paymentMethod is required",
        });
        return;
      }

      if (!paidBy) {
        res.status(400).json({
          success: false,
          message:
            "paidBy is required",
        });
        return;
      }

      const fine =
        await payFineService(
            id,
          {
            amount:
              Number(amount),

            paymentMethod,

            paidBy,
          }
        );

      res.status(200).json({
        success: true,
        message:
          "Fine payment recorded successfully",
        data: fine,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to pay fine",
      });
    }
  };


/* =========================================================
   WAIVE FINE
========================================================= */

export const waiveFineController =
  async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
     const id =
  typeof req.params.id === "string"
    ? req.params.id
    : undefined;

if (!id) {
  res.status(400).json({
    success: false,
    message: "Invalid fine ID",
  });
  return;
}

      const {
        waivedBy,
        reason,
      } = req.body;

      if (!waivedBy) {
        res.status(400).json({
          success: false,
          message:
            "waivedBy is required",
        });
        return;
      }

      if (!reason) {
        res.status(400).json({
          success: false,
          message:
            "reason is required",
        });
        return;
      }

      const fine =
        await waiveFineService(
          id,
          {
            waivedBy,
            reason,
          }
        );

      res.status(200).json({
        success: true,
        message:
          "Fine waived successfully",
        data: fine,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to waive fine",
      });
    }
  };


/* =========================================================
   DELETE FINE
========================================================= */

export const deleteFineController =
  async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const id =
  typeof req.params.id === "string"
    ? req.params.id
    : undefined;

if (!id) {
  res.status(400).json({
    success: false,
    message: "Invalid fine ID",
  });
  return;
}

      const fine =
        await deleteFineService(id);

      res.status(200).json({
        success: true,
        message:
          "Fine deleted successfully",
        data: fine,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to delete fine",
      });
    }
  };