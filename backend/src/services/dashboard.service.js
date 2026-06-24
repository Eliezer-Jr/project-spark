import { appointmentModel } from "../models/appointment.model.js";
import { customerModel } from "../models/customer.model.js";
import { feedbackModel } from "../models/feedback.model.js";
import { paymentModel } from "../models/payment.model.js";
import { serviceRecordModel } from "../models/service-record.model.js";
import { userModel } from "../models/user.model.js";
import { average } from "../utils/dashboard.js";
import { sortBy } from "../utils/sort.js";

function sum(values = []) {
  return values.reduce((total, value) => total + Number(value || 0), 0);
}

export const dashboardService = {
  async getAdminDashboard() {
    const [users, appointments, serviceRecords, payments] = await Promise.all([
      userModel.findAll(),
      appointmentModel.findAll(),
      serviceRecordModel.findAll(),
      paymentModel.findAll(),
    ]);
    const successfulPayments = payments.filter((item) => item.status === "successful");

    return {
      users: users.length,
      activeUsers: users.filter((item) => item.isActive).length,
      inactiveUsers: users.filter((item) => !item.isActive).length,
      artisans: users.filter((item) => item.role === "artisan").length,
      customers: users.filter((item) => item.role === "customer").length,
      appointments: appointments.length,
      services: serviceRecords.length,
      pendingAppointments: appointments.filter((item) => item.status === "pending").length,
      confirmedAppointments: appointments.filter((item) => item.status === "confirmed").length,
      revenue: sum(serviceRecords.map((item) => item.cost)),
      paidRevenue: sum(successfulPayments.map((item) => item.amount)),
      payments: payments.length,
      pendingPayments: payments.filter((item) => item.status === "pending").length,
    };
  },

  async getAdminAnalytics() {
    const [users, appointments, feedback, serviceRecords, payments] = await Promise.all([
      userModel.findAll(),
      appointmentModel.findAll(),
      feedbackModel.findAll(),
      serviceRecordModel.findAll(),
      paymentModel.findAll(),
    ]);
    const successfulPayments = payments.filter((item) => item.status === "successful");

    const roleBreakdown = {
      admin: users.filter((item) => item.role === "admin").length,
      artisan: users.filter((item) => item.role === "artisan").length,
      customer: users.filter((item) => item.role === "customer").length,
    };

    const appointmentBreakdown = appointments.reduce((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {});

    return {
      roleBreakdown,
      appointmentBreakdown,
      averageRating: average(feedback.map((item) => item.rating)),
      totalServices: serviceRecords.length,
      totalRevenue: sum(serviceRecords.map((item) => item.cost)),
      totalPayments: payments.length,
      pendingPayments: payments.filter((item) => item.status === "pending").length,
      paidRevenue: sum(successfulPayments.map((item) => item.amount)),
    };
  },

  async getAdminActivity() {
    const [appointments, feedback] = await Promise.all([
      appointmentModel.findAll(),
      feedbackModel.findAll(),
    ]);

    return {
      recentAppointments: sortBy(appointments, "createdAt", "desc").slice(0, 10),
      recentFeedback: sortBy(feedback, "createdAt", "desc").slice(0, 10),
    };
  },

  async getArtisanDashboard(artisanId) {
    const [customers, appointments, serviceRecords, feedback, payments] = await Promise.all([
      customerModel.findAll(),
      appointmentModel.findAll(),
      serviceRecordModel.findAll(),
      feedbackModel.findAll(),
      paymentModel.findAll(),
    ]);

    const artisanCustomers = customers.filter((item) => item.artisanId === artisanId);
    const artisanAppointments = appointments.filter((item) => item.artisanId === artisanId);
    const artisanServices = serviceRecords.filter((item) => item.artisanId === artisanId);
    const artisanFeedback = feedback.filter((item) => item.artisanId === artisanId);
    const artisanPayments = payments.filter((item) => item.artisanId === artisanId);
    const successfulPayments = artisanPayments.filter((item) => item.status === "successful");

    return {
      customers: artisanCustomers.length,
      appointments: artisanAppointments.length,
      services: artisanServices.length,
      pendingAppointments: artisanAppointments.filter((item) => item.status === "pending").length,
      confirmedAppointments: artisanAppointments.filter((item) => item.status === "confirmed").length,
      averageRating: average(artisanFeedback.map((item) => item.rating)),
      revenue: sum(artisanServices.map((item) => item.cost)),
      paidRevenue: sum(successfulPayments.map((item) => item.amount)),
      payments: artisanPayments.length,
      pendingPayments: artisanPayments.filter((item) => item.status === "pending").length,
      upcomingAppointments: sortBy(artisanAppointments, "scheduledDate", "asc").slice(0, 5),
    };
  },

  async getCustomerDashboard(customerUserId) {
    const [appointments, feedback] = await Promise.all([
      appointmentModel.findAll(),
      feedbackModel.findAll(),
    ]);

    const customerAppointments = appointments.filter((item) => item.customerUserId === customerUserId);
    const customerFeedback = feedback.filter((item) => item.customerUserId === customerUserId);

    return {
      appointments: customerAppointments.length,
      upcomingAppointments: customerAppointments.filter((item) => ["pending", "confirmed"].includes(item.status)).length,
      completed: customerAppointments.filter((item) => item.status === "completed").length,
      feedbacks: customerFeedback.length,
      latestAppointments: sortBy(customerAppointments, "scheduledDate", "desc").slice(0, 5),
    };
  },
};
