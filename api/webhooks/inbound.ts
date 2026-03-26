import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, updateDoc, arrayUnion, Timestamp } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

// Read config dynamically to avoid build issues if path changes
const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
const auth = getAuth(app);

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const payload = req.body;
    console.log('Received webhook payload:', JSON.stringify(payload));
    
    // Resend webhook payload structure
    if (payload.type !== 'email.received') {
      return res.status(200).json({ message: 'Ignored non-email event' });
    }

    const { subject, text, from } = payload.data;

    // Extract messageId from subject: [Ref: {id}]
    const match = subject.match(/\[Ref:\s*([^\]]+)\]/i);
    if (!match) {
      console.log('No message ID found in subject:', subject);
      return res.status(200).json({ message: 'No reference ID found' });
    }

    const messageId = match[1];

    // Authenticate as admin to update Firestore
    const adminEmail = process.env.FIREBASE_ADMIN_EMAIL || 'adminrodney@rnepremiermobilenotary.com';
    const adminPassword = process.env.FIREBASE_ADMIN_PASSWORD || 'passrodney';
    
    await signInWithEmailAndPassword(auth, adminEmail, adminPassword);

    // Update Firestore
    const reply = {
      text: text || 'No text content',
      createdAt: Timestamp.now(),
      sender: 'client'
    };

    await updateDoc(doc(db, 'messages', messageId), {
      replies: arrayUnion(reply),
      status: 'unread' // Mark as unread so admin sees it
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Internal server error' });
  }
}
