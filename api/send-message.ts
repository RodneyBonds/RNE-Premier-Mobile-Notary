import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, email, phone, message } = req.body;

  if (!process.env.RESEND_API_KEY) {
    return res.status(500).json({ error: 'Email service not configured.' });
  }

  try {
    let fromEmail = process.env.RESEND_FROM_EMAIL || 'rodney@rnepremiermobilenotary.com';
    if (fromEmail === 'onboarding@resend.dev') {
      fromEmail = 'rodney@rnepremiermobilenotary.com';
    }

    const { data, error } = await resend.emails.send({
      from: `${name} <${fromEmail}>`,
      to: ['rodney@rnepremiermobilenotary.com'],
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
      console.error('Resend error details:', JSON.stringify(error, null, 2));
      return res.status(400).json({ error: (error as any).message || 'Resend validation error' });
    }

    // Send automated response to the visitor
    const { error: autoResponseError } = await resend.emails.send({
      from: `RNE Premier Mobile Notary Support <${fromEmail}>`,
      to: [email],
      replyTo: 'rodney@rnepremiermobilenotary.com',
      subject: `We've received your message - RNE Premier Mobile Notary`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6;">
          <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #D4AF37;">
            <img src="https://i.imgur.com/wXlz80g.png" alt="RNE Premier Mobile Notary" style="max-height: 60px;" />
          </div>
          <div style="padding: 20px;">
            <h2 style="color: #050B14; margin-top: 0;">We've received your message!</h2>
            <p>Hi ${name},</p>
            <p>Thank you for reaching out to RNE Premier Mobile Notary. This email is to confirm that we have successfully received your message.</p>
            <p>Our team is reviewing your request and will get back to you as soon as possible, usually within a few hours during normal business hours.</p>
            <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #eee;">
              <h4 style="margin-top: 0; color: #555;">Your Message Summary:</h4>
              <p style="margin-bottom: 5px;"><strong>Phone:</strong> ${phone || 'N/A'}</p>
              <p style="margin-bottom: 5px;"><strong>Message:</strong><br/>${message.replace(/\n/g, '<br/>')}</p>
            </div>
            <p>If you need immediate assistance, please reply directly to this email.</p>
            <p>Best regards,<br/><strong>The RNE Premier Mobile Notary Team</strong></p>
          </div>
          <div style="text-align: center; padding: 20px; font-size: 12px; color: #777; border-top: 1px solid #eee; margin-top: 20px;">
            &copy; ${new Date().getFullYear()} RNE Premier Mobile Notary. All rights reserved.
          </div>
        </div>
      `,
    });

    if (autoResponseError) {
      console.error('Resend auto-response error details:', JSON.stringify(autoResponseError, null, 2));
      return res.status(400).json({ error: `Admin email sent, but auto-response failed: ${(autoResponseError as any).message}` });
    }

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Server error sending email:', error);
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Internal server error' });
  }
}
