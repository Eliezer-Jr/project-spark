import { sendEmail } from "../mail/mailer.js";
import { userModel } from "../models/user.model.js";
import { smsService } from "./sms.service.js";

function formatAppointmentDateTime(appointment) {
  return `${appointment.scheduledDate} at ${String(appointment.scheduledTime).slice(0, 5)}`;
}

function shouldSendEmail(user) {
  return Boolean(user?.email && user.notifyEmail !== false && user.notifyEmail !== 0);
}

function shouldSendSms(user) {
  return Boolean(user?.phone && user.notifySms !== false && user.notifySms !== 0);
}

async function quietly(label, task) {
  try {
    await task();
  } catch (error) {
    console.warn(`[notifications] ${label} failed: ${error.message}`);
  }
}

async function notifyUser(user, message) {
  if (!user) return;

  if (shouldSendEmail(user)) {
    await quietly(`email to ${user.email}`, () =>
      sendEmail({
        to: user.email,
        subject: message.subject,
        text: message.emailText,
        html: message.emailHtml,
      }),
    );
  }

  if (shouldSendSms(user)) {
    await quietly(`sms to ${user.phone}`, () =>
      smsService.sendSms({
        to: user.phone,
        message: message.smsText,
      }),
    );
  }
}

export const notificationMessageService = {
  async appointmentCreated(appointment, createdByRole) {
    const [artisan, customer] = await Promise.all([
      userModel.findById(appointment.artisanId),
      appointment.customerUserId ? userModel.findById(appointment.customerUserId) : null,
    ]);

    const customerName = customer?.fullName || "A customer";
    const artisanName = artisan?.fullName || "your artisan";
    const dateTime = formatAppointmentDateTime(appointment);

    if (createdByRole === "artisan") {
      await notifyUser(customer, {
        subject: `Appointment scheduled: ${appointment.title}`,
        smsText: `${artisanName} scheduled "${appointment.title}" for ${dateTime}. Check your appointments for details.`,
        emailText: `${artisanName} scheduled "${appointment.title}" for ${dateTime}. Please check your appointments for details.`,
        emailHtml: `<p><strong>${artisanName}</strong> scheduled <strong>${appointment.title}</strong> for ${dateTime}.</p><p>Please check your appointments for details.</p>`,
      });
      return;
    }

    await notifyUser(artisan, {
      subject: `New appointment request: ${appointment.title}`,
      smsText: `${customerName} requested "${appointment.title}" for ${dateTime}. Check your dashboard to respond.`,
      emailText: `${customerName} requested an appointment for "${appointment.title}" on ${dateTime}.\n\nDetails: ${
        appointment.description || "No extra details provided."
      }\n\nPlease sign in to review this booking.`,
      emailHtml: `<p>${customerName} requested an appointment for <strong>${appointment.title}</strong> on ${dateTime}.</p><p>${
        appointment.description || "No extra details provided."
      }</p><p>Please sign in to review this booking.</p>`,
    });

    await notifyUser(customer, {
      subject: `Appointment request sent to ${artisanName}`,
      smsText: `Your request for "${appointment.title}" with ${artisanName} was sent for ${dateTime}.`,
      emailText: `Your appointment request for "${appointment.title}" with ${artisanName} was sent for ${dateTime}. We will notify you when it is updated.`,
      emailHtml: `<p>Your appointment request for <strong>${appointment.title}</strong> with ${artisanName} was sent for ${dateTime}.</p><p>We will notify you when it is updated.</p>`,
    });
  },

  async appointmentUpdated(appointment, previousAppointment) {
    const [artisan, customer] = await Promise.all([
      userModel.findById(appointment.artisanId),
      appointment.customerUserId ? userModel.findById(appointment.customerUserId) : null,
    ]);

    const artisanName = artisan?.fullName || "your artisan";
    const customerName = customer?.fullName || "The customer";
    const dateTime = formatAppointmentDateTime(appointment);
    const previousStatus =
      typeof previousAppointment === "string" ? previousAppointment : previousAppointment?.status;
    const previousJourneyStatus =
      typeof previousAppointment === "object" ? previousAppointment?.journeyStatus : null;
    const statusChanged = previousStatus && previousStatus !== appointment.status;
    const artisanJustArrived =
      appointment.journeyStatus === "arrived" && previousJourneyStatus !== "arrived";

    if (artisanJustArrived) {
      await notifyUser(customer, {
        subject: `${artisanName} has arrived: ${appointment.title}`,
        smsText: `${artisanName} has arrived for your service "${appointment.title}". Please meet them at the service location.`,
        emailText: `${artisanName} has arrived for your service "${appointment.title}". Please meet them at the service location.`,
        emailHtml: `<p><strong>${artisanName} has arrived</strong> for your service <strong>${appointment.title}</strong>.</p><p>Please meet them at the service location.</p>`,
      });
    }

    if (!statusChanged) return;

    await notifyUser(customer, {
      subject: `Appointment ${appointment.status}: ${appointment.title}`,
      smsText: `Your appointment "${appointment.title}" with ${artisanName} is now ${appointment.status}. Scheduled for ${dateTime}.`,
      emailText: `Your appointment "${appointment.title}" with ${artisanName} is now ${appointment.status}. It is scheduled for ${dateTime}.`,
      emailHtml: `<p>Your appointment <strong>${appointment.title}</strong> with ${artisanName} is now <strong>${appointment.status}</strong>.</p><p>Scheduled for ${dateTime}.</p>`,
    });

    await notifyUser(artisan, {
      subject: `Appointment ${appointment.status}: ${appointment.title}`,
      smsText: `${customerName}'s appointment "${appointment.title}" is now ${appointment.status}. Scheduled for ${dateTime}.`,
      emailText: `${customerName}'s appointment "${appointment.title}" is now ${appointment.status}. It is scheduled for ${dateTime}.`,
      emailHtml: `<p>${customerName}'s appointment <strong>${appointment.title}</strong> is now <strong>${appointment.status}</strong>.</p><p>Scheduled for ${dateTime}.</p>`,
    });
  },
};
