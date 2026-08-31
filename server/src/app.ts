import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import authRoutes from "./routes/auth.routes.js";

const app = express();

app.use(helmet());

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan("dev"));

app.get("/api/v1/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Library Management ERP API is running",
    version: "1.0.0",
  });
});

app.use("/api/v1/auth", authRoutes);

export default app;