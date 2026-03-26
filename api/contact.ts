import { Resend } from 'resend';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { name, email, phone, message } = req.body;
  if (!process.env.RESEND_API_KEY) return res.status(500).json({ error: "Email service not configured." });

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const fromEmail = process.env.RESEND_FROM_EMAIL || "RNE Premier Contact Form <onboarding@resend.dev>";

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: ["rodneyrnepremiermobilenotary@gmail.com"],
      replyTo: email,
      subject: `New Contact Form: ${name}`,
      html: `<h2>New Message</h2><p><strong>Name:</strong> ${name}</p><p><strong>Email:</strong> ${email}</p><p><strong>Phone:</strong> ${phone}</p><p><strong>Message:</strong></p><p>${message}</p>`,
    });

    if (error) return res.status(400).json({ error });
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
}
