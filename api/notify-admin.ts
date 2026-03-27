import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, email, message, type } = req.body;

  if (!process.env.RESEND_API_KEY) {
    return res.status(500).json({ error: 'Email service not configured.' });
  }

  try {
    let fromEmail = process.env.RESEND_FROM_EMAIL || 'rodney@rnepremiermobilenotary.com';
    if (fromEmail === 'onboarding@resend.dev') {
      fromEmail = 'rodney@rnepremiermobilenotary.com';
    }
    const adminEmail = 'rodney@rnepremiermobilenotary.com';

    let subject = `New Message from ${name}`;
    let html = `
      <h2>New Message in Live Chat</h2>
      <p><strong>Visitor:</strong> ${name} (${email})</p>
      <p><strong>Message:</strong></p>
      <p>${message}</p>
      <p><em>Log in to the Admin Panel to reply.</em></p>
    `;

    if (type === 'unanswered') {
      subject = `Unanswered Message from ${name}`;
      html = `
        <h2>Unanswered Message in Live Chat</h2>
        <p><strong>Visitor:</strong> ${name} (${email})</p>
        <p><strong>Message:</strong></p>
        <p>${message}</p>
        <p><em>This message has been unanswered for a while. Log in to the Admin Panel to reply.</em></p>
      `;
    }

    const { data, error } = await resend.emails.send({
      from: `${name} <${fromEmail}>`,
      to: [adminEmail],
      replyTo: email,
      subject,
      html,
    });

    if (error) {
      console.error('Resend error:', error);
      return res.status(400).json({ error: error.message });
    }

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Server error sending notification:', error);
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Internal server error' });
  }
}
