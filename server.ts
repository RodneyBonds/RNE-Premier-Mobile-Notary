import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import dotenv from "dotenv";
import cors from "cors";
import { Resend } from "resend";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, where, getDocs, updateDoc, doc, serverTimestamp } from "firebase/firestore";
import fs from "fs";

dotenv.config();

// Read firebase config
const firebaseConfigPath = path.join(process.cwd(), 'firebase-applet-config.json');
let firebaseConfig: any = {};
if (fs.existsSync(firebaseConfigPath)) {
  firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf-8'));
}

// Initialize Firebase Client
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);

// Hourly notification check
setInterval(async () => {
  try {
    const sessionsRef = collection(db, 'chatSessions');
    const q = query(sessionsRef, where('status', '==', 'active'), where('hasUnreadMessages', '==', true));
    const sessions = await getDocs(q);
    
    const now = Date.now();
    for (const sessionDoc of sessions.docs) {
      const data = sessionDoc.data();
      // Handle Timestamp from client SDK
      const lastNotificationAt = data.lastNotificationAt?.toMillis ? data.lastNotificationAt.toMillis() : 0;
      if (now - lastNotificationAt >= 3600000) { // 1 hour
        const fromEmail = process.env.RESEND_FROM_EMAIL || 'rodney@rnepremiermobilenotary.com';
        
        await resend.emails.send({
          from: fromEmail,
          to: ['rodneyrnepremiermobilenotary@gmail.com'],
          subject: `Unanswered Contact from ${data.name} - RNE Premier Mobile Notary`,
          html: `
            <h2>Unanswered Message in Live Chat</h2>
            <p><strong>Visitor:</strong> ${data.name} (${data.email})</p>
            <p><strong>Message:</strong> This message has been unanswered for a while. Log in to the Admin Panel to reply.</p>
          `,
        });
        
        await updateDoc(doc(db, 'chatSessions', sessionDoc.id), { 
          lastNotificationAt: serverTimestamp() 
        });
      }
    }
  } catch (error) {
    console.error("Error in hourly notification check:", error);
  }
}, 60000); // Check every minute

async function startServer() {
  console.log("Starting server...");
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // API Route for sending emails via Resend (for preview environment)
  app.post("/api/send-message", async (req, res) => {
    console.log(`POST /api/send-message request received`);
    const { name, email, phone, message } = req.body;

    if (!process.env.RESEND_API_KEY) {
      console.error("RESEND_API_KEY is missing");
      return res.status(500).json({ error: "Email service not configured." });
    }

    try {
      const fromEmail = process.env.RESEND_FROM_EMAIL || 'rodney@rnepremiermobilenotary.com';

      const { data, error } = await resend.emails.send({
        from: fromEmail,
        to: ['rodneyrnepremiermobilenotary@gmail.com'],
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

  // API Route for notifying admin about live chat
  app.post("/api/notify-admin", async (req, res) => {
    console.log(`POST /api/notify-admin request received`);
    const { name, email, message, type } = req.body;

    if (!process.env.RESEND_API_KEY) {
      console.error("RESEND_API_KEY is missing");
      return res.status(500).json({ error: "Email service not configured." });
    }

    try {
      const fromEmail = process.env.RESEND_FROM_EMAIL || 'rodney@rnepremiermobilenotary.com';
      const subject = type === 'start' ? `New Live Chat Request from ${name}` : `New Live Chat Message from ${name}`;

      const { data, error } = await resend.emails.send({
        from: fromEmail,
        to: ['rodneyrnepremiermobilenotary@gmail.com'],
        replyTo: email,
        subject: subject,
        html: `
          <h2>${type === 'start' ? 'New Live Chat Request' : 'New Message in Live Chat'}</h2>
          <p><strong>Visitor:</strong> ${name} (${email})</p>
          ${message ? `<p><strong>Message:</strong> ${message}</p>` : ''}
          <p><a href="https://rnepremiermobilenotary.com/admin">Log in to the Admin Panel</a> to reply.</p>
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

  // API Route for sending chat transcripts
  app.post("/api/send-transcript", async (req, res) => {
    console.log(`POST /api/send-transcript request received`);
    const { name, email, phone, messages } = req.body;

    if (!process.env.RESEND_API_KEY) {
      console.error("RESEND_API_KEY is missing");
      return res.status(500).json({ error: "Email service not configured." });
    }

    try {
      const fromEmail = process.env.RESEND_FROM_EMAIL || 'rodney@rnepremiermobilenotary.com';

      const formattedMessages = messages.map((msg: any) => {
        const time = new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        return `<p><strong>[${time}] ${msg.senderName || (msg.senderId === 'admin' ? 'Support' : name)}:</strong> ${msg.text}</p>`;
      }).join('');

      const { data, error } = await resend.emails.send({
        from: fromEmail,
        to: [email, 'rodneyrnepremiermobilenotary@gmail.com'],
        subject: `Your Chat Transcript with RNE Premier Mobile Notary`,
        html: `
          <h2>Chat Transcript</h2>
          <p><strong>Visitor:</strong> ${name} (${email})</p>
          ${phone ? `<p><strong>Phone:</strong> ${phone}</p>` : ''}
          <hr />
          <div style="margin-top: 20px;">
            ${formattedMessages}
          </div>
        `,
      });

      if (error) {
        console.error("Resend error details:", JSON.stringify(error, null, 2));
        return res.status(400).json({ error: (error as any).message || 'Resend validation error' });
      }

      res.status(200).json({ success: true, data });
    } catch (error) {
      console.error("Server error sending transcript:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Internal server error" });
    }
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
