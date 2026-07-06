import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT || 587),
  secure: false,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

export async function sendMail({ to, subject, html }) {
  return transporter.sendMail({
    from: `"Smart Kitchen" <${process.env.SMTP_USER}>`, to, subject, html,
  });
}

export async function sendPasswordReset(to, resetLink) {
  return sendMail({
    to, subject: "Smart Kitchen — Rivendos Fjalëkalimin",
    html: `<div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:32px">
      <h2 style="color:#e8602c">Smart Kitchen</h2>
      <p>Ke kërkuar rivendosjen e fjalëkalimit. Kliko butonin:</p>
      <a href="${resetLink}" style="display:inline-block;padding:12px 24px;background:#e8602c;color:white;border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0">Rivendos Fjalëkalimin</a>
      <p style="color:#666;font-size:12px">Linku skadon pas <strong>1 ore</strong>.</p></div>`,
  });
}
