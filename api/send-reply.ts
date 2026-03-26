import { Resend } from 'resend';

export default async function handler(req: any, res: any) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { name, email, replyText, originalMessage } = req.body;

    if (!process.env.RESEND_API_KEY) {
      return res.status(500).json({ error: 'Email service not configured. Please add RESEND_API_KEY to environment variables.' });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    const { data, error } = await resend.emails.send({
      from: 'RNE Premier Mobile Notary <onboarding@resend.dev>',
      to: [email],
      replyTo: 'rodneyrnepremiermobilenotary@gmail.com',
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
      return res.status(400).json({ error });
    }

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Server error sending email:', error);
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Internal server error' });
  }
}
