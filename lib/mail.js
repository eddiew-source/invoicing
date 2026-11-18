import nodemailer from 'nodemailer';

export async function sendInvoiceEmail({ to, cc, subject, text, filename, pdf, replyTo }) {
  const port = Number(process.env.SMTP_PORT || 587);
  if (!process.env.SMTP_HOST) throw new Error('SMTP_HOST is not set');

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: process.env.SMTP_SECURE === 'true' || port === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });

  await transporter.sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to,
    cc: cc || undefined,
    bcc: process.env.MAIL_BCC || undefined,
    replyTo: replyTo || undefined,
    subject,
    text,
    attachments: [{ filename, content: Buffer.from(pdf), contentType: 'application/pdf' }],
  });
}
