import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import dotenv from "dotenv";
import cors from "cors";
import { createServer } from "http";
import { Resend } from "resend";

dotenv.config();

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);

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

  // API Route for sending emails via Resend
  apiRouter.post("/send-message", async (req, res) => {
    console.log(`POST /api/send-message request received`);
    const { name, email, phone, message } = req.body;

    if (!process.env.RESEND_API_KEY) {
      console.error("RESEND_API_KEY is missing");
      return res.status(500).json({ error: "Email service not configured." });
    }

    try {
      const fromEmail = process.env.RESEND_FROM_EMAIL || "Contact Form <onboarding@resend.dev>";

      const { data, error } = await resend.emails.send({
        from: fromEmail,
        to: ["rodneyrnepremiermobilenotary@gmail.com"],
        replyTo: email,
        subject: `New Contact Form: ${name}`,
        html: `
          <h2>New Message from Contact Form</h2>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Phone:</strong> ${phone}</p>
          <p><strong>Message:</strong></p>
          <p>${message}</p>
        `,
      });

      if (error) {
        console.error("Resend error details:", JSON.stringify(error, null, 2));
        return res.status(400).json({ error: (error as any).message || 'Resend validation error' });
      }

      res.status(200).json({ success: true, data });
    } catch (error) {
      console.error("Server error sending email:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Internal server error" });
    }
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
