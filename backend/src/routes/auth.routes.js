import { Router } from "express";
import { asyncHandler } from "../utils/async-handler.js";
import { login, signup } from "../controllers/auth.controller.js";

const router = Router();

router.post("/login", asyncHandler(login));
router.post("/signup", asyncHandler(signup));

export default router;
