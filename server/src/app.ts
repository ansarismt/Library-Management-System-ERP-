import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import bookCopyRoutes from "./routes/bookCopy.routes.js";
import bookRoutes from "./routes/book.routes.js";
import memberRoutes from "./routes/member.routes.js";
import issueRoutes from "./routes/issue.routes.js";
import fineRoutes from "./routes/fine.routes.js";
import reservationRoutes from "./routes/reservation.routes.js";
import reportRoutes from "./routes/report.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import auditRoutes from "./routes/audit.routes.js";
import settingsRoutes from "./routes/settings.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import {
  errorHandler,
  notFoundHandler,
} from "./middleware/error.middleware.js";
import { apiLimiter } from "./middleware/rate-limit.middleware.js";

const app = express();
const allowedOrigins = (process.env.CLIENT_URL ?? "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const configuredProxyHops = Number(process.env.TRUST_PROXY_HOPS ?? 0);
const trustProxyHops = Number.isInteger(configuredProxyHops) && configuredProxyHops >= 0
  ? configuredProxyHops
  : 0;

// Direct deployments must not accept client-supplied X-Forwarded-For values.
// Set this to the exact number of trusted reverse-proxy hops when applicable.
app.set("trust proxy", trustProxyHops);
app.use(helmet({ crossOriginResourcePolicy: false }));

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Origin not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

app.get("/api/v1/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Library Management System API is running",
    status: "healthy",
  });
});

// Health remains available for monitoring; API traffic is limited below it.
app.use("/api/v1", apiLimiter);

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/book-copies", bookCopyRoutes);
app.use("/api/v1/books", bookRoutes);
app.use("/api/v1/members", memberRoutes);
app.use("/api/v1/issues", issueRoutes);
app.use("/api/v1/fines", fineRoutes);
app.use("/api/v1/reservations", reservationRoutes);
app.use("/api/v1/reports", reportRoutes);
app.use("/api/v1/dashboard", dashboardRoutes);
app.use("/api/v1/audit-logs", auditRoutes);
app.use("/api/v1/settings", settingsRoutes);
app.use("/api/v1/notifications", notificationRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
