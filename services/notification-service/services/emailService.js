const nodemailer = require('nodemailer');

let transporter = null;
if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

exports.sendHtmlEmail = async (to, subject, html) => {
  if (!to) return { sent: false, reason: 'no recipient' };
  if (transporter) {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@feedo.com',
      to,
      subject,
      html,
    });
    return { sent: true, channel: 'email' };
  }
  console.log(`[notification-email] (dev) to=${to} subject=${subject}`);
  return { sent: true, channel: 'email', dev: true };
};
