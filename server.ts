import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import dotenv from "dotenv";
import cors from "cors";
import { createServer } from "http";

dotenv.config();

async function startServer() {
  console.log("Starting server...");
  const app = express();
  const httpServer = createServer(app);
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // API Router definition
  const apiRouter = express.Router();

  apiRouter.use((req, res, next) => {
    console.log(`API Request: ${req.method} ${req.path}`);
    next();
  });

  // Health check
  apiRouter.get("/health", (req, res) => {
    res.json({ status: "ok", message: "API is alive" });
  });

  // Mount the API router
  app.use("/api", apiRouter);

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      // If it's an API route that wasn't handled by apiRouter, return 404 JSON instead of HTML
      if (req.path.startsWith("/api/")) {
        console.log(`Unmatched API request hitting catch-all: ${req.method} ${req.path}`);
        return res.status(404).json({ error: `API route ${req.method} ${req.path} not found` });
      }
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
