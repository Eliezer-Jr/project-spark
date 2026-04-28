import { sendEmail } from "../mail/mailer.js";
import { smsService } from "../services/sms.service.js";
import { HTTP_STATUS } from "../constants/http-status.js";
import { sendResponse } from "../utils/api-response.js";

export async function sendSms(req, res) {
  const result = await smsService.sendSms({
    to: req.body.to,
    message: req.body.message,
    senderId: req.body.senderId,
  });

  return sendResponse(res, HTTP_STATUS.OK, "SMS queued for delivery.", result);
}

export async function generateSmsOtp(req, res) {
  const result = await smsService.generateOtp({
    number: req.body.number,
    expiry: req.body.expiry,
    length: req.body.length,
    type: req.body.type,
    senderId: req.body.senderId,
    messageTemplate: req.body.messageTemplate,
  });

  return sendResponse(res, HTTP_STATUS.OK, "SMS OTP queued for delivery.", result);
}

export async function verifySmsOtp(req, res) {
  const result = await smsService.verifyOtp({
    number: req.body.number,
    otpcode: req.body.otpcode,
  });

  return sendResponse(res, HTTP_STATUS.OK, "SMS OTP verification completed.", result);
}

export async function sendNotificationEmail(req, res) {
  const result = await sendEmail({
    to: req.body.to,
    subject: req.body.subject,
    text: req.body.text,
    html: req.body.html,
  });

  return sendResponse(res, HTTP_STATUS.OK, "Email processed.", {
    accepted: result.accepted ?? [],
    rejected: result.rejected ?? [],
    skipped: result.skipped ?? false,
    reason: result.reason ?? null,
  });
}
