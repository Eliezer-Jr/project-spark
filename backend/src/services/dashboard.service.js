import { appointmentModel } from "../models/appointment.model.js";
import { customerModel } from "../models/customer.model.js";
import { feedbackModel } from "../models/feedback.model.js";
import { serviceRecordModel } from "../models/service-record.model.js";
import { userModel } from "../models/user.model.js";
import { average } from "../utils/dashboard.js";
import { sortBy } from "../utils/sort.js";

export const dashboardService = {
  async getAdminDashboard() {
    const [users, appointments, serviceRecords] = await Promise.all([
      userModel.findAll(),
      appointmentModel.findAll(),
      serviceRecordModel.findAll(),
    ]);

    return {
      users: users.length,
      artisans: users.filter((item) => item.role === "artisan").length,
      customers: users.filter((item) => item.role === "customer").length,
      appointments: appointments.length,
      services: serviceRecords.length,
    };
  },

  async getAdminAnalytics() {
    const [users, appointments, feedback, serviceRecords] = await Promise.all([
      userModel.findAll(),
      appointmentModel.findAll(),
      feedbackModel.findAll(),
      serviceRecordModel.findAll(),
    ]);

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
    const [customers, appointments, serviceRecords, feedback] = await Promise.all([
      customerModel.findAll(),
      appointmentModel.findAll(),
      serviceRecordModel.findAll(),
      feedbackModel.findAll(),
    ]);

    const artisanCustomers = customers.filter((item) => item.artisanId === artisanId);
    const artisanAppointments = appointments.filter((item) => item.artisanId === artisanId);
    const artisanServices = serviceRecords.filter((item) => item.artisanId === artisanId);
    const artisanFeedback = feedback.filter((item) => item.artisanId === artisanId);

    return {
      customers: artisanCustomers.length,
      appointments: artisanAppointments.length,
      services: artisanServices.length,
      averageRating: average(artisanFeedback.map((item) => item.rating)),
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
      completed: customerAppointments.filter((item) => item.status === "completed").length,
      feedbacks: customerFeedback.length,
    };
  },
};
