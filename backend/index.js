import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { createServer } from "http";

import { db } from "./config/db.js";
import { connectMongo } from "./config/mongo.js";
import routes from "./routes/index.js";
import { initSocket } from "./socket.js";
import { startExpiryAlertCron } from "./util/cron.js";
import { openApiSpec } from "./util/openapi.js";

dotenv.config();

const app = express();
const server = createServer(app);

const configuredOrigins = (
  process.env.FRONTEND_URL || "http://localhost:5173,http://localhost:5174"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const backendPort = process.env.PORT || "5000";
const defaultAllowedOrigins = [
  ...configuredOrigins,
  `http://localhost:${backendPort}`,
  `http://127.0.0.1:${backendPort}`,
  `http://localhost:5173`,
  `http://localhost:5174`,
];
const allowedOrigins = [...new Set(defaultAllowedOrigins.filter(Boolean))];

const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error(`CORS blocked origin: ${origin}`));
  },
  credentials: true,
};

// ── Socket.IO ──────────────────────────────────────────────
// Inicializimi jeton në socket.js për të shmangur varësinë rrethore
// (market.service.js / cron.js importonin më parë `io` direkt nga index.js).
initSocket(server, { origin: allowedOrigins, credentials: true });

// ── Middleware ─────────────────────────────────────────────
app.use(cors(corsOptions));
app.use(helmet({ contentSecurityPolicy: false })); // Security headers

// Rate limiting
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minuta
  max: 10,
  message: {
    success: false,
    message: "Shumë tentativa hyrjeje. Provo pas 15 minutave.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { success: false, message: "Shumë kërkesa. Provo pas pak." },
});
app.use("/api/auth/login", loginLimiter);
app.use("/api/auth/forgot-password", loginLimiter);
app.use("/api/", apiLimiter);
app.use(express.json());
app.use(cookieParser());
app.use(morgan("dev"));

// ── Routes ─────────────────────────────────────────────────
app.get("/", (_, res) =>
  res.json({
    success: true,
    message: "Smart Kitchen API ",
    docs: "/api/openapi.json",
  }),
);
app.get("/api/openapi.json", (_, res) => res.json(openApiSpec));
app.get("/api/docs", (_, res) =>
  res.type("html").send(`<!doctype html>
<html>
<head>
  <title>Smart Kitchen API — Swagger UI</title>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
</head>
<body style="margin:0">
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    SwaggerUIBundle({
      url: "/api/openapi.json",
      dom_id: "#swagger-ui",
      presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset],
      layout: "BaseLayout",
      deepLinking: true,
      tryItOutEnabled: true,
      requestInterceptor: (req) => {
        const token = localStorage.getItem("accessToken");
        if (token) req.headers["Authorization"] = "Bearer " + token;
        return req;
      }
    });
  </script>
</body>
</html>`),
);
app.use("/api", routes);

// ── 404 ────────────────────────────────────────────────────
app.use((req, res) =>
  res
    .status(404)
    .json({ success: false, message: `Route ${req.path} not found` }),
);

// ── Error handler ──────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err.message);
  const isProd = process.env.NODE_ENV === "production";
  res.status(err.status || 500).json({
    success: false,
    message: err.status ? err.message : "Internal server error",
    // Detajet e plota (p.sh. mesazhe SQL) shfaqen VETËM në development, kurrë në production.
    ...(!isProd && !err.status ? { debug: err.message } : {}),
  });
});

// ── Start ──────────────────────────────────────────────────
const startServer = async () => {
  try {
    const conn = await db.getConnection();
    console.log("MySQL connected");
    conn.release();

    // MongoDB përdoret vetëm si cache ndihmëse për MLRecommendation
    // (MLService.getAllFromMongo ka tashmë fallback në []).
    // Nuk duhet të bllokojë startup-in nëse MongoDB nuk është i disponueshëm.
    try {
      await connectMongo();
    } catch (mongoErr) {
      console.warn(
        `MongoDB i padisponueshëm (${mongoErr.message}) — vazhdo pa cache MongoDB.`,
      );
    }

    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => {
      console.log(`Server: http://localhost:${PORT}`);
      console.log(`Socket.IO ready`);
      console.log(`Allowed frontend origins: ${allowedOrigins.join(", ")}`);
      startExpiryAlertCron();
    });
  } catch (error) {
    console.error("Startup failed:", error.message);
    process.exit(1);
  }
};

startServer();
