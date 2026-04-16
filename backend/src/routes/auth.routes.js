import { Router } from "express";
import { validateLogin, validateSignup } from "../middleware/validation.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";
import { login, signup } from "../controllers/auth.controller.js";

const router = Router();

router.post("/login", validateLogin, asyncHandler(login));
router.post("/signup", validateSignup, asyncHandler(signup));

export default router;
