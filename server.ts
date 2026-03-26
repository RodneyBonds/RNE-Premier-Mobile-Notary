import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

async function startServer() {
  console.log("Starting server...");
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Log all incoming requests for debugging
  app.use((req, res, next) => {
    console.log(`[${req.method}] ${req.url}`);
    next();
  });

  // API Route for sending emails via Resend
  app.post("/api/send-message", async (req, res) => {
    console.log(`POST /api/send-message request received`);
    console.log("Body:", JSON.stringify(req.body));
    const { name, email, phone, message } = req.body;

    if (!process.env.RESEND_API_KEY) {
      console.error("RESEND_API_KEY is missing");
      return res.status(500).json({ error: "Email service not configured. Please add RESEND_API_KEY to environment variables." });
    }

    try {
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);
      const fromEmail = process.env.RESEND_FROM_EMAIL || "RNE Premier Contact Form <onboarding@resend.dev>";

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
        console.error("Resend error response:", JSON.stringify(error));
        return res.status(400).json({ error });
      }

      console.log("Email sent successfully:", JSON.stringify(data));
      res.status(200).json({ success: true, data });
    } catch (error) {
      console.error("Server error sending email:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Internal server error" });
    }
  });

  // API Route for sending replies to clients
  app.post("/api/send-reply", async (req, res) => {
    console.log(`POST /api/send-reply request received`);
    console.log("Body:", JSON.stringify(req.body));
    const { name, email, replyText, originalMessage } = req.body;

    if (!process.env.RESEND_API_KEY) {
      console.error("RESEND_API_KEY is missing");
      return res.status(500).json({ error: "Email service not configured. Please add RESEND_API_KEY to environment variables." });
    }

    try {
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);
      const fromEmail = process.env.RESEND_FROM_EMAIL || "RNE Premier Mobile Notary <onboarding@resend.dev>";

      const { data, error } = await resend.emails.send({
        from: fromEmail,
        to: [email],
        replyTo: "rodneyrnepremiermobilenotary@gmail.com",
        subject: `Re: Your Contact Form Submission - RNE Premier`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Hello ${name},</h2>
            <p>Thank you for reaching out to RNE Premier Mobile Notary. Here is our reply to your message:</p>
            
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="white-space: pre-wrap; margin: 0;">${replyText}</p>
            </div>
            
            <p>Best regards,<br>Rodney<br>RNE Premier Mobile Notary</p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            
            <div style="color: #6b7280; font-size: 14px;">
              <p><strong>Your original message:</strong></p>
              <p style="white-space: pre-wrap;">${originalMessage}</p>
            </div>
          </div>
        `,
      });

      if (error) {
        console.error("Resend error response:", JSON.stringify(error));
        return res.status(400).json({ error });
      }

      console.log("Reply email sent successfully:", JSON.stringify(data));
      res.status(200).json({ success: true, data });
    } catch (error) {
      console.error("Server error sending reply email:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Internal server error" });
    }
  });

  // Handle preflight requests
  app.options("/api/send-message", (req, res) => {
    res.status(204).end();
  });
  app.options("/api/send-reply", (req, res) => {
    res.status(204).end();
  });

  // Also add a GET handler to debug 405 errors
  app.get("/api/send-message", (req, res) => {
    res.status(200).json({ message: "Contact API is reachable via GET. Use POST for submissions." });
  });

  // Add a health check route to verify API is working
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "API is alive" });
  });

  // Catch-all for API routes
  app.all("/api/*", (req, res) => {
    res.status(404).json({ error: `API route ${req.method} ${req.url} not found` });
  });

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
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
