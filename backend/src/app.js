import cors from "cors";
import express from "express";
import morgan from "morgan";
import { env } from "./config/env.js";
import { requestIdMiddleware } from "./middleware/request-id.middleware.js";
import routes from "./routes/index.js";
import { errorMiddleware } from "./middleware/error.middleware.js";
import { notFoundMiddleware } from "./middleware/not-found.middleware.js";

const app = express();

app.use(
  cors({
    origin(origin, callback) {
      if (
        !origin ||
        env.frontendUrls.includes(origin) ||
        /^http:\/\/127\.0\.0\.1:\d+$/.test(origin) ||
        /^http:\/\/localhost:\d+$/.test(origin)
      ) {
        callback(null, true);
        return;
      }

      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: "12mb" }));
app.use(express.urlencoded({ extended: true, limit: "12mb" }));
app.use(requestIdMiddleware);
app.use(morgan("dev"));

app.get("/", (_req, res) => {
  res.json({
    success: true,
    message: `${env.appName} is ready.`,
    requestId: res.locals.requestId || null,
  });
});

app.use("/api", routes);
app.use(notFoundMiddleware);
app.use(errorMiddleware);

export default app;
