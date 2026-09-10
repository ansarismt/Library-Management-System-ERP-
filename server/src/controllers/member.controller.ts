import { NextFunction, Request, Response } from "express";

import {
  createMemberService,
  listMembersService,
  getMemberService,
  updateMemberService,
  deleteMemberService,
} from "../services/member.service.js";
import { AUDIT_ACTIONS } from "../constants/auditActions.js";
import { auditRequest } from "../services/audit.service.js";

export const createMemberController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const member = await createMemberService(req.body);

    await auditRequest(req, {
      action: AUDIT_ACTIONS.MEMBER_CREATED,
      resourceType: "MEMBER",
      resourceId: member._id.toString(),
      description: "Member created",
      after: {
        memberId: member.memberId,
        name: member.name,
        email: member.email,
        membershipType: member.membershipType,
        status: member.status,
      },
      success: true,
      statusCode: 201,
    });

    res.status(201).json({
      success: true,
      message: "Member created successfully",
      data: member,
    });
  } catch (error) {
    next(error);
  }
};

export const listMembersController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const members = await listMembersService(req.query as never);

    res.status(200).json({
      success: true,
      data: members.items,
      pagination: members.pagination,
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

    const beforeMember = await getMemberService(id);
    const member = await updateMemberService(
      id,
      req.body
    );

    await auditRequest(req, {
      action: AUDIT_ACTIONS.MEMBER_UPDATED,
      resourceType: "MEMBER",
      resourceId: id,
      description: "Member updated",
      before: {
        memberId: beforeMember.memberId,
        name: beforeMember.name,
        email: beforeMember.email,
        membershipType: beforeMember.membershipType,
        status: beforeMember.status,
      },
      after: member ? {
        memberId: member.memberId,
        name: member.name,
        email: member.email,
        membershipType: member.membershipType,
        status: member.status,
      } : undefined,
      success: true,
      statusCode: 200,
    });

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

    const member = await getMemberService(id);
    await deleteMemberService(id);

    await auditRequest(req, {
      action: AUDIT_ACTIONS.MEMBER_DELETED,
      resourceType: "MEMBER",
      resourceId: id,
      description: "Member deleted",
      before: {
        memberId: member.memberId,
        name: member.name,
        email: member.email,
        membershipType: member.membershipType,
        status: member.status,
      },
      success: true,
      statusCode: 200,
    });

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