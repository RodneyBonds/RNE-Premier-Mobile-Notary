import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import dotenv from "dotenv";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import fs from "fs";
import { Resend } from "resend";
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, updateDoc, arrayUnion, Timestamp, onSnapshot } from 'firebase/firestore';

dotenv.config();

// Initialize Firebase for the server
const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const firebaseApp = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
const db = firebaseConfig.firestoreDatabaseId 
  ? getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId) 
  : getFirestore(firebaseApp);
const auth = getAuth(firebaseApp);

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);

// Sign in as admin on startup
const adminEmail = process.env.FIREBASE_ADMIN_EMAIL || 'adminrodney@rnepremiermobilenotary.com';
const adminPassword = process.env.FIREBASE_ADMIN_PASSWORD || 'passrodney';

signInWithEmailAndPassword(auth, adminEmail, adminPassword)
  .then(() => console.log("Server authenticated as admin"))
  .catch(err => console.error("Server admin auth failed:", err));

async function startServer() {
  console.log("Starting server...");
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });
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
    const mask = (val: string | undefined) => val ? `${val.substring(0, 3)}...` : null;
    
    // List of keys we are looking for
    const searchKeys = [
      "RESEND_API_KEY", "VITE_RESEND_API_KEY",
      "FIREBASE_ADMIN_EMAIL", "VITE_FIREBASE_ADMIN_EMAIL",
      "FIREBASE_ADMIN_PASSWORD", "VITE_FIREBASE_ADMIN_PASSWORD"
    ];
    
    // Find which ones actually exist in process.env
    const foundKeys = Object.keys(process.env).filter(k => searchKeys.includes(k));

    res.json({ 
      status: "ok", 
      message: "API is alive",
      env: {
        hasResendKey: !!(process.env.RESEND_API_KEY || process.env.VITE_RESEND_API_KEY),
        hasAdminEmail: !!(process.env.FIREBASE_ADMIN_EMAIL || process.env.VITE_FIREBASE_ADMIN_EMAIL),
        hasAdminPass: !!(process.env.FIREBASE_ADMIN_PASSWORD || process.env.VITE_FIREBASE_ADMIN_PASSWORD),
        resendKey: mask(process.env.RESEND_API_KEY || process.env.VITE_RESEND_API_KEY),
        adminEmail: mask(process.env.FIREBASE_ADMIN_EMAIL || process.env.VITE_FIREBASE_ADMIN_EMAIL),
        foundKeys: foundKeys
      }
    });
  });

  // Ping test
  apiRouter.get("/ping", (req, res) => {
    res.json({ message: "pong" });
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

  // API Route for starting a live chat
  apiRouter.post("/start-chat", async (req, res) => {
    console.log(`POST /api/start-chat request received`);
    const { name, email, message, sessionId, time } = req.body;

    if (!process.env.RESEND_API_KEY) {
      return res.status(500).json({ error: "Email service not configured." });
    }

    try {
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);
      const fromEmail = process.env.RESEND_FROM_EMAIL || "RNE Premier Live Chat <onboarding@resend.dev>";

      const { data, error } = await resend.emails.send({
        from: fromEmail,
        to: ["rodneyrnepremiermobilenotary@gmail.com"],
        subject: `Live Chat Request: ${name}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; padding: 30px; background-color: #ffffff;">
            <h2 style="color: #050B14; margin-top: 0;">New Live Chat Request</h2>
            <p style="color: #4b5563; font-size: 16px;">A visitor wants to start a live chat session.</p>
            
            <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <p style="margin: 0 0 10px 0;"><strong>Visitor Name:</strong> ${name}</p>
              <p style="margin: 0 0 10px 0;"><strong>Visitor Email:</strong> ${email}</p>
              <p style="margin: 0 0 10px 0;"><strong>Time:</strong> ${time}</p>
              <p style="margin: 0 0 10px 0;"><strong>Session ID:</strong> <code style="background: #eee; padding: 2px 4px; border-radius: 4px;">${sessionId}</code></p>
              ${message ? `<p style="margin: 10px 0 0 0;"><strong>Initial Message:</strong><br>${message}</p>` : ''}
            </div>
            
            <p style="color: #6b7280; font-size: 14px; margin-bottom: 0;">Please log in to your admin panel to respond to this chat.</p>
          </div>
        `,
      });

      if (error) return res.status(400).json({ error });
      res.status(200).json({ success: true, data });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Internal server error" });
    }
  });

  // API Route for visitor chat message notification
  apiRouter.post("/notify-chat-message", async (req, res) => {
    const { name, email, message, sessionId } = req.body;

    if (!process.env.RESEND_API_KEY) {
      return res.status(500).json({ error: "Email service not configured." });
    }

    try {
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);
      const fromEmail = process.env.RESEND_FROM_EMAIL || "RNE Premier Live Chat <onboarding@resend.dev>";

      const { data, error } = await resend.emails.send({
        from: fromEmail,
        to: ["rodneyrnepremiermobilenotary@gmail.com"],
        subject: `New Chat Message from ${name}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; padding: 30px; background-color: #ffffff;">
            <h3 style="color: #050B14; margin-top: 0;">New Message in Chat</h3>
            <p style="color: #4b5563;"><strong>From:</strong> ${name} (${email})</p>
            <p style="color: #4b5563;"><strong>Session:</strong> ${sessionId}</p>
            
            <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #D4AF37;">
              <p style="margin: 0; white-space: pre-wrap;">${message}</p>
            </div>
            
            <p style="color: #6b7280; font-size: 12px;">Reply via the admin panel.</p>
          </div>
        `,
      });

      if (error) return res.status(400).json({ error });
      res.status(200).json({ success: true, data });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Internal server error" });
    }
  });

  // API Route for transitioning chat to email (Transcript)
  apiRouter.post("/transition-to-email", async (req, res) => {
    const { name, email, transcript, sessionId } = req.body;

    if (!process.env.RESEND_API_KEY) {
      return res.status(500).json({ error: "Email service not configured." });
    }

    try {
      const fromEmail = process.env.RESEND_FROM_EMAIL || "RNE Premier Live Chat <onboarding@resend.dev>";
      const adminEmail = "rodneyrnepremiermobilenotary@gmail.com";

      const transcriptHtml = transcript.map((msg: any) => `
        <div style="margin-bottom: 15px; padding: 10px; border-radius: 8px; background-color: ${msg.sender === 'admin' ? '#f0f9ff' : '#f9fafb'}; border: 1px solid ${msg.sender === 'admin' ? '#bae6fd' : '#e5e7eb'};">
          <p style="margin: 0 0 5px 0; font-weight: bold; color: ${msg.sender === 'admin' ? '#0369a1' : '#374151'};">
            ${msg.sender === 'admin' ? 'Admin' : 'Visitor'}:
          </p>
          <p style="margin: 0; white-space: pre-wrap; color: #1f2937;">${msg.text}</p>
        </div>
      `).join('');

      const emailHtml = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; padding: 30px; background-color: #ffffff;">
          <h2 style="color: #050B14; margin-top: 0; text-align: center;">Chat Transcript</h2>
          <p style="color: #4b5563; text-align: center;">This conversation has been transitioned to email.</p>
          
          <div style="margin: 30px 0;">
            <p style="font-weight: bold; color: #050B14; border-bottom: 1px solid #e5e7eb; padding-bottom: 10px; margin-bottom: 20px;">Conversation History</p>
            ${transcriptHtml}
          </div>
          
          <div style="background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 8px; padding: 15px; color: #92400e; font-size: 14px;">
            <p style="margin: 0;"><strong>Note:</strong> Future replies should be sent directly via email.</p>
          </div>
          
          <p style="color: #9ca3af; font-size: 12px; margin-top: 30px; text-align: center;">Session ID: ${sessionId}</p>
        </div>
      `;

      // Send to Admin
      await resend.emails.send({
        from: fromEmail,
        to: [adminEmail],
        replyTo: email,
        subject: `Chat Transcript & Transition: ${name}`,
        html: emailHtml,
      });

      // Send to Visitor
      await resend.emails.send({
        from: fromEmail,
        to: [email],
        replyTo: adminEmail,
        subject: `Your Chat Transcript with RNE Premier`,
        html: emailHtml,
      });

      res.status(200).json({ success: true });
    } catch (error) {
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
      const userCredential = await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
      console.log(`Signed in successfully as: ${userCredential.user.email} (UID: ${userCredential.user.uid})`);
      
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

      try {
        await updateDoc(docRef, {
          replies: arrayUnion(reply),
          status: 'unread'
        });
      } catch (fsError: any) {
        console.error('Firestore Update Error Details:', {
          code: fsError.code,
          message: fsError.message,
          stack: fsError.stack
        });
        throw fsError;
      }

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
      
      console.log(`Signing in as admin for test: ${adminEmail}`);
      const userCredential = await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
      console.log(`Signed in successfully for test: ${userCredential.user.email} (UID: ${userCredential.user.uid})`);

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

      try {
        await updateDoc(docRef, {
          replies: arrayUnion(reply),
          status: 'unread'
        });
      } catch (fsError: any) {
        console.error('Firestore Test Update Error Details:', {
          code: fsError.code,
          message: fsError.message,
          stack: fsError.stack
        });
        throw fsError;
      }

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

  // Mount the API router early
  app.use("/api", apiRouter);

  // Log all other requests for debugging
  app.use((req, res, next) => {
    console.log(`[${req.method}] ${req.url}`);
    next();
  });

  // WebSocket logic
  io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    socket.on("join-chat", (sessionId) => {
      socket.join(sessionId);
      console.log(`User ${socket.id} joined chat session: ${sessionId}`);
      
      // Start watching Firestore for this session
      const unsubscribe = onSnapshot(doc(db, "messages", sessionId), (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (data.replies) {
            // Send the latest replies to the visitor
            socket.emit("chat-update", data.replies);
          }
        }
      });

      socket.on("disconnect", () => {
        unsubscribe();
        console.log("User disconnected:", socket.id);
      });
    });

    socket.on("send-message", async ({ sessionId, text, sender, name, email }) => {
      try {
        const newReply = {
          text,
          createdAt: Timestamp.now(),
          sender,
        };

        await updateDoc(doc(db, "messages", sessionId), {
          replies: arrayUnion(newReply),
          status: 'unread' // Mark as unread for admin
        });

        // Notify admin via email for each visitor message
        if (sender === 'visitor') {
          await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
            to: "rodneyrnepremiermobilenotary@gmail.com",
            subject: `New Live Chat Message from ${name}`,
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h2 style="color: #333;">New Message in Live Chat</h2>
                <p><strong>Visitor:</strong> ${name} (${email})</p>
                <p><strong>Message:</strong></p>
                <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; border-left: 4px solid #007bff;">
                  ${text}
                </div>
                <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
                <p style="font-size: 12px; color: #666;">Session ID: ${sessionId}</p>
                <p style="font-size: 12px; color: #666;">Time: ${new Date().toLocaleString()}</p>
              </div>
            `
          });
        }
      } catch (error) {
        console.error("Error handling chat message:", error);
      }
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

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
