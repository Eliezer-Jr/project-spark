import nodemailer from "nodemailer";
import { env } from "../config/env.js";
import { HTTP_STATUS } from "../constants/http-status.js";
import { AppError } from "../exceptions/AppError.js";

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  if (!env.email.host || !env.email.from) {
    return null;
  }

  transporter = nodemailer.createTransport({
    host: env.email.host,
    port: env.email.port,
    secure: env.email.secure,
    auth: env.email.user
      ? {
          user: env.email.user,
          pass: env.email.password,
        }
      : undefined,
  });

  return transporter;
}

export async function sendEmail({ to, subject, text, html, from = env.email.from }) {
  if (!to?.trim() || !subject?.trim() || (!text?.trim() && !html?.trim())) {
    throw new AppError("Email recipient, subject and message are required.", HTTP_STATUS.BAD_REQUEST);
  }

  const activeTransporter = getTransporter();

  if (!activeTransporter) {
    console.log(`[mailer] Email not sent because SMTP is not configured: ${subject} -> ${to}`);
    return {
      skipped: true,
      reason: "SMTP is not configured.",
      accepted: [],
    };
  }

  return activeTransporter.sendMail({
    from,
    to,
    subject,
    text,
    html,
  });
}

export async function sendWelcomeEmail(user) {
  return sendEmail({
    to: user.email,
    subject: `Welcome to ${env.appName}`,
    text: `Hello ${user.fullName || user.email}, welcome to ${env.appName}.`,
  });
}
