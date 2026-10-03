import express, { type Request, type Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { env } from '#config/env.config.js';
import { generateOpenApiDocument, saveOpenApiDocument } from '#config/openapi.config.js';
import { chatRoutes } from '#modules/chat/index.js';
import { promptRoutes } from '#modules/prompt/index.js';
import { authRoutes, optionalAuth } from '#modules/auth/index.js';
import { roleRoutes } from '#modules/role/index.js';
import { adminRagRoutes, ragRoutes, bullBoardRouter } from '#modules/rag/index.js';
import {
  notFoundHandler,
  globalErrorHandler,
  devLoggerMiddleware,
} from '#shared/middleware/index.js';
import { devInspectorRoutes } from '#shared/dev-inspector/index.js';

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

// Geliştirme ortamında istek/yanıt loglaması ve Canlı Trafik & Stream Inspector (sadece development)
if (process.env['NODE_ENV'] !== 'production') {
  app.use(devLoggerMiddleware);
  app.use('/api/dev/inspector', devInspectorRoutes);
  app.use('/dev/inspector', devInspectorRoutes);
  app.use('/dev-inspector', devInspectorRoutes);
}

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

// Bull-Board Kuyruk Yönetim Paneli
app.use('/admin/queues', bullBoardRouter);

// API Rotaları
app.use('/api/auth', authRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/chat', optionalAuth, chatRoutes);
app.use('/api/prompts', optionalAuth, promptRoutes);
app.use('/api/rag', ragRoutes);
app.use('/api/admin/rag', adminRagRoutes);

// 404 & Global Error Handling
app.use(notFoundHandler);
app.use(globalErrorHandler);

export default app;