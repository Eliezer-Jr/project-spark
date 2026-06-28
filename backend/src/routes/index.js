import { Router } from "express";
import authRoutes from "./auth.routes.js";
import appointmentRoutes from "./appointment.routes.js";
import customerRoutes from "./customer.routes.js";
import dashboardRoutes from "./dashboard.routes.js";
import feedbackRoutes from "./feedback.routes.js";
import healthRoutes from "./health.routes.js";
import messageRoutes from "./message.routes.js";
import notificationRoutes from "./notification.routes.js";
import paymentRoutes from "./payment.routes.js";
import serviceCategoryRoutes from "./service-category.routes.js";
import serviceRecordRoutes from "./service-record.routes.js";
import systemRoutes from "./system.routes.js";
import userRoutes from "./user.routes.js";

const router = Router();

router.use("/health", healthRoutes);
router.use("/messages", messageRoutes);
router.use("/system", systemRoutes);
router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/service-categories", serviceCategoryRoutes);
router.use("/categories", serviceCategoryRoutes);
router.use("/customers", customerRoutes);
router.use("/service-records", serviceRecordRoutes);
router.use("/appointments", appointmentRoutes);
router.use("/feedback", feedbackRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/notifications", notificationRoutes);
router.use("/payments", paymentRoutes);

export default router;
