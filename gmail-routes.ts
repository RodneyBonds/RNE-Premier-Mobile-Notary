import { Router } from 'express';
import { google } from 'googleapis';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

const router = Router();

// Helper to get Firebase instance
const getFirebase = () => {
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const app = initializeApp(firebaseConfig, 'gmail-app');
  const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
  const auth = getAuth(app);
  return { db, auth };
};

// Helper to get OAuth2 client
const getOAuth2Client = (redirectUri: string) => {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri
  );
};

// 1. Generate Auth URL
router.get('/auth/google/url', (req, res) => {
  const { redirectUri, uid } = req.query;
  
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.status(500).json({ error: 'Google OAuth credentials not configured' });
  }

  const oauth2Client = getOAuth2Client(redirectUri as string);
  const scopes = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.modify'
  ];

  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: scopes,
    state: `${uid}|${redirectUri}`
  });

  res.json({ url });
});

// 2. Handle OAuth Callback
router.get('/auth/google/callback', async (req, res) => {
  const { code, state } = req.query;
  
  try {
    const [uid, redirectUri] = (state as string).split('|');
    const oauth2Client = getOAuth2Client(redirectUri);
    const { tokens } = await oauth2Client.getToken(code as string);

    const { db, auth } = getFirebase();
    const adminEmail = process.env.FIREBASE_ADMIN_EMAIL || 'adminrodney@rnepremiermobilenotary.com';
    const adminPassword = process.env.FIREBASE_ADMIN_PASSWORD || 'passrodney';
    await signInWithEmailAndPassword(auth, adminEmail, adminPassword);

    await setDoc(doc(db, 'users', uid, 'integrations', 'gmail'), {
      tokens,
      updatedAt: new Date().toISOString()
    });

    res.send(`
      <html><body><script>
        if (window.opener) {
          window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
          window.close();
        } else {
          window.location.href = '/';
        }
      </script></body></html>
    `);
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.status(500).send('Authentication failed');
  }
});

// Helper to get authenticated Gmail client
const getGmailClient = async (uid: string, redirectUri: string) => {
  const { db, auth } = getFirebase();
  const adminEmail = process.env.FIREBASE_ADMIN_EMAIL || 'adminrodney@rnepremiermobilenotary.com';
  const adminPassword = process.env.FIREBASE_ADMIN_PASSWORD || 'passrodney';
  await signInWithEmailAndPassword(auth, adminEmail, adminPassword);

  const docSnap = await getDoc(doc(db, 'users', uid, 'integrations', 'gmail'));
  if (!docSnap.exists()) {
    throw new Error('Gmail not connected');
  }

  const { tokens } = docSnap.data();
  const oauth2Client = getOAuth2Client(redirectUri);
  oauth2Client.setCredentials(tokens);

  // Auto-refresh token if needed and save back
  oauth2Client.on('tokens', async (newTokens) => {
    const updatedTokens = { ...tokens, ...newTokens };
    await setDoc(doc(db, 'users', uid, 'integrations', 'gmail'), {
      tokens: updatedTokens,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  });

  return google.gmail({ version: 'v1', auth: oauth2Client });
};

// 3. Fetch Inbox
router.get('/gmail/inbox', async (req, res) => {
  const { uid, redirectUri, pageToken } = req.query;
  
  try {
    const gmail = await getGmailClient(uid as string, redirectUri as string);
    const response = await gmail.users.messages.list({
      userId: 'me',
      q: 'in:inbox',
      maxResults: 20,
      pageToken: pageToken as string | undefined
    });

    const messages = response.data.messages || [];
    const fullMessages = await Promise.all(messages.map(async (msg) => {
      const msgData = await gmail.users.messages.get({
        userId: 'me',
        id: msg.id!,
        format: 'metadata',
        metadataHeaders: ['Subject', 'From', 'Date']
      });
      
      const headers = msgData.data.payload?.headers || [];
      const subject = headers.find(h => h.name === 'Subject')?.value || 'No Subject';
      const from = headers.find(h => h.name === 'From')?.value || 'Unknown';
      const date = headers.find(h => h.name === 'Date')?.value || '';

      return {
        id: msg.id,
        threadId: msg.threadId,
        snippet: msgData.data.snippet,
        subject,
        from,
        date,
        unread: msgData.data.labelIds?.includes('UNREAD')
      };
    }));

    res.json({ messages: fullMessages, nextPageToken: response.data.nextPageToken });
  } catch (error: any) {
    console.error('Fetch inbox error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 4. Fetch Single Message/Thread
router.get('/gmail/message/:id', async (req, res) => {
  const { uid, redirectUri } = req.query;
  const { id } = req.params;

  try {
    const gmail = await getGmailClient(uid as string, redirectUri as string);
    const response = await gmail.users.messages.get({
      userId: 'me',
      id,
      format: 'full'
    });

    // Mark as read
    if (response.data.labelIds?.includes('UNREAD')) {
      await gmail.users.messages.modify({
        userId: 'me',
        id,
        requestBody: { removeLabelIds: ['UNREAD'] }
      });
    }

    res.json(response.data);
  } catch (error: any) {
    console.error('Fetch message error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 5. Send Reply
router.post('/gmail/reply', async (req, res) => {
  const { uid, redirectUri, to, subject, text, threadId, messageId } = req.body;

  try {
    const gmail = await getGmailClient(uid as string, redirectUri as string);
    
    const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
    const messageParts = [
      `To: ${to}`,
      `Subject: ${utf8Subject}`,
      `In-Reply-To: ${messageId}`,
      `References: ${messageId}`,
      'Content-Type: text/plain; charset=utf-8',
      'MIME-Version: 1.0',
      '',
      text
    ];
    const message = messageParts.join('\n');
    const encodedMessage = Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const response = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage,
        threadId
      }
    });

    res.json({ success: true, data: response.data });
  } catch (error: any) {
    console.error('Send reply error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
