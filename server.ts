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

  // Top-level health check
  app.get("/api-health", (req, res) => {
    res.json({ status: "ok", message: "Server is reachable" });
  });

  // Log all incoming requests for debugging
  app.use((req, res, next) => {
    console.log(`[${req.method}] ${req.url}`);
    next();
  });

  const apiRouter = express.Router();

  apiRouter.use((req, res, next) => {
    console.log(`API Request: ${req.method} ${req.path}`);
    next();
  });

  // API Route for sending emails via Resend
  apiRouter.post("/send-message", async (req, res) => {
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
  apiRouter.post("/send-reply", async (req, res) => {
    console.log(`POST /api/send-reply request received`);
    console.log("Body:", JSON.stringify(req.body));
    const { messageId, name, email, replyText, originalMessage } = req.body;

    if (!process.env.RESEND_API_KEY) {
      console.error("RESEND_API_KEY is missing");
      return res.status(500).json({ error: "Email service not configured. Please add RESEND_API_KEY to environment variables." });
    }

    try {
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);
      const fromEmail = process.env.RESEND_FROM_EMAIL || "RNE Premier Mobile Notary <onboarding@resend.dev>";
      const replyToEmail = process.env.RESEND_INBOUND_EMAIL || "Rodbonds1169@gmail.com";

      const { data, error } = await resend.emails.send({
        from: fromEmail,
        to: [email],
        replyTo: replyToEmail,
        subject: `Re: Your Contact Form Submission - RNE Premier [Ref: ${messageId}]`,
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

  // API Route for inbound webhooks from Resend
  apiRouter.post("/webhooks/inbound", async (req, res) => {
    console.log(`POST /api/webhooks/inbound request received`);
    try {
      const payload = req.body;
      console.log('Received webhook payload:', JSON.stringify(payload, null, 2));
      
      if (!payload || payload.type !== 'email.received') {
        console.log('Ignored non-email event or empty payload');
        return res.status(200).json({ message: 'Ignored non-email event' });
      }

      const data = payload.data;
      if (!data) {
        console.error('No data found in payload');
        return res.status(400).json({ error: 'No data found in payload' });
      }

      const { subject, text, from } = data;
      if (!subject) {
        console.error('No subject found in email data');
        return res.status(200).json({ message: 'No subject found' });
      }

      const match = subject.match(/\[Ref:\s*([^\]]+)\]/i);
      if (!match) {
        console.log('No reference ID found in subject:', subject);
        return res.status(200).json({ message: 'No reference ID found' });
      }

      const messageId = match[1];
      console.log(`Processing reply for message ID: ${messageId}`);

      // Dynamic import to avoid top-level issues
      const { initializeApp, getApps } = await import('firebase/app');
      const { getAuth, signInWithEmailAndPassword } = await import('firebase/auth');
      const { getFirestore, doc, updateDoc, arrayUnion, Timestamp, getDoc } = await import('firebase/firestore');
      const fs = await import('fs');
      const path = await import('path');

      const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
      const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

      const apps = getApps();
      const firebaseApp = apps.find(a => a.name === 'webhook-app') || initializeApp(firebaseConfig, 'webhook-app');
      
      // Helper to get Firestore with fallback
      const getFirestoreWithFallback = (app: any, config: any) => {
        try {
          if (config.firestoreDatabaseId) {
            return getFirestore(app, config.firestoreDatabaseId);
          }
        } catch (e) {
          console.warn('Failed to initialize Firestore with custom ID in webhook, falling back to (default)', e);
        }
        return getFirestore(app);
      };

      const db = getFirestoreWithFallback(firebaseApp, firebaseConfig);
      const auth = getAuth(firebaseApp);

      const adminEmail = process.env.FIREBASE_ADMIN_EMAIL || 'adminrodney@rnepremiermobilenotary.com';
      const adminPassword = process.env.FIREBASE_ADMIN_PASSWORD || 'passrodney';
      
      console.log(`Signing in as admin: ${adminEmail}`);
      await signInWithEmailAndPassword(auth, adminEmail, adminPassword);

      const reply = {
        text: text || 'No text content',
        createdAt: Timestamp.now(),
        sender: 'client',
        fromEmail: from || 'unknown'
      };

      console.log(`Updating document ${messageId} with reply from ${from}`);
      
      const docRef = doc(db, 'messages', messageId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        console.error(`Message document with ID ${messageId} not found in Firestore`);
        return res.status(404).json({ error: `Message ${messageId} not found` });
      }

      await updateDoc(docRef, {
        replies: arrayUnion(reply),
        status: 'unread'
      });

      console.log('Document updated successfully');
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Webhook error:', error);
      return res.status(500).json({ error: error instanceof Error ? error.message : 'Internal server error' });
    }
  });

  // Test route to simulate a webhook for a specific message
  apiRouter.get("/test-webhook/:messageId", async (req, res) => {
    const { messageId } = req.params;
    console.log(`Simulating webhook for message: ${messageId}`);
    
    try {
      // Dynamic import to avoid top-level issues
      const { initializeApp, getApps } = await import('firebase/app');
      const { getAuth, signInWithEmailAndPassword } = await import('firebase/auth');
      const { getFirestore, doc, updateDoc, arrayUnion, Timestamp, getDoc } = await import('firebase/firestore');
      const fs = await import('fs');
      const path = await import('path');

      const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
      const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

      const apps = getApps();
      const firebaseApp = apps.find(a => a.name === 'test-app') || initializeApp(firebaseConfig, 'test-app');
      
      const getFirestoreWithFallback = (app: any, config: any) => {
        if (config.firestoreDatabaseId) return getFirestore(app, config.firestoreDatabaseId);
        return getFirestore(app);
      };

      const db = getFirestoreWithFallback(firebaseApp, firebaseConfig);
      const auth = getAuth(firebaseApp);

      const adminEmail = process.env.FIREBASE_ADMIN_EMAIL || 'adminrodney@rnepremiermobilenotary.com';
      const adminPassword = process.env.FIREBASE_ADMIN_PASSWORD || 'passrodney';
      
      await signInWithEmailAndPassword(auth, adminEmail, adminPassword);

      const reply = {
        text: "This is a TEST reply simulated from the server.",
        createdAt: Timestamp.now(),
        sender: 'client',
        fromEmail: 'test@example.com'
      };

      const docRef = doc(db, 'messages', messageId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        return res.status(404).json({ error: `Message ${messageId} not found. Make sure the ID is correct.` });
      }

      await updateDoc(docRef, {
        replies: arrayUnion(reply),
        status: 'unread'
      });

      res.json({ success: true, message: "Test reply added successfully. Check your admin panel!" });
    } catch (error) {
      console.error('Test webhook error:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Internal server error' });
    }
  });

  // Handle preflight requests
  apiRouter.options("/send-message", (req, res) => {
    res.status(204).end();
  });
  apiRouter.options("/send-reply", (req, res) => {
    res.status(204).end();
  });

  // Also add a GET handler to debug 405 errors
  apiRouter.get("/send-message", (req, res) => {
    res.status(200).json({ message: "Contact API is reachable via GET. Use POST for submissions." });
  });

  // Add a health check route to verify API is working
  apiRouter.get("/health", (req, res) => {
    res.json({ status: "ok", message: "API is alive" });
  });

  // Mount the API router
  app.use("/api", apiRouter);

  app.get("/api/*", (req, res) => {
    console.log(`404 API Route Not Found: ${req.method} ${req.path}`);
    res.status(404).json({ 
      error: `API route ${req.method} ${req.path} not found`,
      suggestion: "Check if the route is correctly defined in server.ts"
    });
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
      // If it's an API route that wasn't handled by apiRouter, return 404 JSON instead of HTML
      if (req.path.startsWith("/api/")) {
        console.log(`Unmatched API request hitting catch-all: ${req.method} ${req.path}`);
        return res.status(404).json({ error: `API route ${req.method} ${req.path} not found` });
      }
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
