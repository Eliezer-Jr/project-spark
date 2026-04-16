import { Router } from "express";
import { getSystemBootstrap } from "../controllers/system.controller.js";
import { asyncHandler } from "../utils/async-handler.js";

const router = Router();

router.get("/bootstrap", asyncHandler(getSystemBootstrap));

export default router;
