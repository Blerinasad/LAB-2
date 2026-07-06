import { Router } from "express";

import { openApiSpec } from "../util/openapi.util.js";

const router = Router();

const swaggerHtml = `<!doctype html>
<html>
<head>
  <title>Smart Kitchen API - Swagger UI</title>
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
</html>`;

router.get("/openapi.json", (_, res) => res.json(openApiSpec));
router.get("/docs", (_, res) => res.type("html").send(swaggerHtml));

export default router;
