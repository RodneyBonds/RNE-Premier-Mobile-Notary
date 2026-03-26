import { Resend } from 'resend';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { to, subject, text, html, messageId } = req.body;

  if (!process.env.RESEND_API_KEY) {
    return res.status(500).json({ error: "Email service not configured." });
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const fromEmail = process.env.RESEND_FROM_EMAIL || "RNE Premier Support <onboarding@resend.dev>";
    const inboundEmail = process.env.RESEND_INBOUND_EMAIL || "replies@rnepremiermobilenotary.com";

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to,
      replyTo: inboundEmail,
      subject: `${subject} [Ref: ${messageId}]`,
      text,
      html,
    });

    if (error) return res.status(400).json({ error });
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
}
