import "dotenv/config";

import app from "./app.js";
import { connectDatabase } from "./config/database.js";

const PORT = Number(process.env.PORT) || 5000;
const HOST = "0.0.0.0";

const startServer = async (): Promise<void> => {
  try {
    await connectDatabase();

    app.listen(PORT, HOST, () => {
      console.log(`
╔══════════════════════════════════════════╗
║   Library Management System ERP          ║
║   MERN Backend                            ║
║                                          ║
║   Server: http://${HOST}:${PORT}         ║
║   Health: http://${HOST}:${PORT}/api/v1/health
╚══════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error("Server startup failed:", error);
    process.exit(1);
  }
};

startServer();