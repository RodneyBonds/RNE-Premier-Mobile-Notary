import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, email, phone, messages } = req.body;

  if (!process.env.RESEND_API_KEY) {
    return res.status(500).json({ error: 'Email service not configured.' });
  }

  try {
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'rodney@rnepremiermobilenotary.com';
    const adminEmail = 'rodney@rnepremiermobilenotary.com';

    // Format the chat transcript
    const transcriptHtml = messages.map((msg: any) => {
      const sender = msg.senderId === 'admin' ? 'Support Agent' : msg.senderId === 'system' ? 'System' : name;
      const time = new Date(msg.timestamp).toLocaleString();
      return `<div style="margin-bottom: 10px;">
        <strong>${sender}</strong> <span style="color: #666; font-size: 0.8em;">(${time})</span><br/>
        ${msg.text}
      </div>`;
    }).join('');

    // Send to Admin (with Reply-To set to Visitor)
    const adminEmailResult = await resend.emails.send({
      from: `${name} <${fromEmail}>`,
      to: [adminEmail],
      replyTo: email,
      subject: `Chat Transcript: ${name}`,
      html: `
        <h2>Chat Transcript with ${name}</h2>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Phone:</strong> ${phone || 'N/A'}</p>
        <hr/>
        <div style="background: #f9f9f9; padding: 15px; border-radius: 5px;">
          ${transcriptHtml}
        </div>
        <hr/>
        <p><em>Reply to this email to continue the conversation with the visitor.</em></p>
      `,
    });

    if (adminEmailResult.error) {
      console.error('Resend error (admin):', adminEmailResult.error);
      return res.status(400).json({ error: adminEmailResult.error.message });
    }

    // Send to Visitor (with Reply-To set to Admin)
    const visitorEmailResult = await resend.emails.send({
      from: `RNE Premier Mobile Notary Support <${fromEmail}>`,
      to: [email],
      replyTo: adminEmail,
      subject: `Your Chat Transcript with Support`,
      html: `
        <h2>Your Chat Transcript</h2>
        <p>Hi ${name},</p>
        <p>Here is a copy of your recent chat with our support team.</p>
        <hr/>
        <div style="background: #f9f9f9; padding: 15px; border-radius: 5px;">
          ${transcriptHtml}
        </div>
        <hr/>
        <p><em>Reply to this email to continue the conversation with us.</em></p>
      `,
    });

    if (visitorEmailResult.error) {
      console.error('Resend error (visitor):', visitorEmailResult.error);
      return res.status(400).json({ error: visitorEmailResult.error.message });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Server error sending transcript:', error);
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Internal server error' });
  }
}
