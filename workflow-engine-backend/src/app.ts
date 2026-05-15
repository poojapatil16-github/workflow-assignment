import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { buildSwaggerSpec } from './config/swagger.js';
import { errorMiddleware } from './middleware/error.middleware.js';
import { requestLoggerMiddleware } from './middleware/request-logger.middleware.js';
import apiRoutes from './routes/index.js';
import healthRoutes from './modules/health/health.routes.js';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));
  app.use(requestLoggerMiddleware);

  app.use('/health', healthRoutes);
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(buildSwaggerSpec(), { explorer: true }));

  app.use('/api/v1', apiRoutes);

  app.use((_req, res) => {
    res.status(404).json({ success: false, message: 'Not found', errors: [] });
  });

  app.use(errorMiddleware);
  return app;
}
