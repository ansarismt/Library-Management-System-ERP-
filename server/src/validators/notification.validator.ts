import { z } from "zod";
import { idParamsSchema } from "./common.validator.js";
export const notificationIdParamsSchema = idParamsSchema;
export const notificationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  unread: z.enum(["true", "false"]).optional().transform((value) => value === "true"),
}).strict();
