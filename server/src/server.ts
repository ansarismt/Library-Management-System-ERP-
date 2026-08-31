import dotenv from "dotenv";
import app from "./app.js";
import { connectDatabase } from "./config/database.js";

dotenv.config();

const PORT = Number(process.env.PORT) || 5000;

const startServer = async (): Promise<void> => {
  try {
    await connectDatabase();

    app.listen(PORT, () => {
      console.log(`
╔══════════════════════════════════════════╗
║   Library Management System ERP          ║
║   MERN Backend                            ║
║                                          ║
║   Server: http://localhost:${PORT}       ║
║   Health: http://localhost:${PORT}/api/v1/health
╚══════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error("Server startup failed:", error);
    process.exit(1);
  }
};

startServer();