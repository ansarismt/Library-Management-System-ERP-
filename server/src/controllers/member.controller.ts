import { Request, Response } from "express";

import {
  createMemberService,
  listMembersService,
  getMemberService,
  updateMemberService,
  deleteMemberService,
} from "../services/member.service.js";

export const createMemberController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const member = await createMemberService(req.body);

    res.status(201).json({
      success: true,
      message: "Member created successfully",
      data: member,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to create member";

    res.status(400).json({
      success: false,
      message,
    });
  }
};

export const listMembersController = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const members = await listMembersService();

    res.status(200).json({
      success: true,
      data: members,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to fetch members";

    res.status(500).json({
      success: false,
      message,
    });
  }
};

export const getMemberController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    if (typeof id !== "string") {
      res.status(400).json({
        success: false,
        message: "Invalid member ID",
      });
      return;
    }

    const member = await getMemberService(id);

    res.status(200).json({
      success: true,
      data: member,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to fetch member";

    res.status(404).json({
      success: false,
      message,
    });
  }
};

export const updateMemberController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    if (typeof id !== "string") {
      res.status(400).json({
        success: false,
        message: "Invalid member ID",
      });
      return;
    }

    const member = await updateMemberService(
      id,
      req.body
    );

    res.status(200).json({
      success: true,
      message: "Member updated successfully",
      data: member,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to update member";

    res.status(400).json({
      success: false,
      message,
    });
  }
};

export const deleteMemberController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    if (typeof id !== "string") {
      res.status(400).json({
        success: false,
        message: "Invalid member ID",
      });
      return;
    }

    await deleteMemberService(id);

    res.status(200).json({
      success: true,
      id,
      message: "Member deleted successfully",
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to delete member";

    res.status(400).json({
      success: false,
      message,
    });
  }
};