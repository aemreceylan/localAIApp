import express, { type Request, type Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { env } from '#config/env.config.js';
import { generateOpenApiDocument, saveOpenApiDocument } from '#config/openapi.config.js';
import { chatRoutes } from '#modules/chat/index.js';
import { promptRoutes } from '#modules/prompt/index.js';
import {
  notFoundHandler,
  globalErrorHandler,
  tenantMiddleware,
} from '#shared/middleware/index.js';

const app = express();

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        'img-src': ["'self'", 'data:', 'https://validator.swagger.io'],
        'script-src': ["'self'", "'unsafe-inline'"],
        'style-src': ["'self'", "'unsafe-inline'"],
      },
    },
  })
);

app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  })
);

app.use(express.json({ limit: '2mb' }));

// OpenAPI / Swagger Dokümantasyonu (Hem web üzerinden sunulur hem de diske kaydedilir)
const openApiDoc = generateOpenApiDocument();
try {
  saveOpenApiDocument();
} catch (err) {
  console.warn('[OpenAPI] Doküman diske otomatik kaydedilirken uyarı:', err);
}

app.get('/api/docs.json', (_req: Request, res: Response) => {
  res.status(200).json(openApiDoc);
});
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApiDoc));

app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API Rotaları (Tenant Doğrulama ve İzolasyon Middleware ile korumalı)
app.use('/api/chat', tenantMiddleware, chatRoutes);
app.use('/api/prompts', tenantMiddleware, promptRoutes);

// 404 & Global Error Handling
app.use(notFoundHandler);
app.use(globalErrorHandler);

export default app;