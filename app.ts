import express from 'express';
import { Request, Response } from 'express';
import { UserRoutes } from './src/modules/auth/user/user.router';
import { ImporterProfileRoutes } from './src/modules/auth/importerProfile/importerProfile.router';
import { ExporterProfileRoutes } from './src/modules/auth/exporterProfile/exporterProfile.router';
import { UserStorageRoutes } from './src/modules/userStorage/userStorage.router';
import { MediaRoutes } from './src/modules/media/media.router';
import { AdminRoutes } from './src/modules/auth/admin/admin.router';
import { CategoryRoutes } from './src/modules/category/category.router';
import { ProductRoutes } from './src/modules/product/product.router';
import cors from 'cors';
import config from './src/config';

const app = express();

app.use(
  cors({
    origin(origin, callback) {
      const allowed = config.cors_origins;
      if (!origin) {
        callback(null, true);
        return;
      }
      if (allowed.includes(origin)) {
        callback(null, origin);
        return;
      }
      callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    optionsSuccessStatus: 204,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.get('/', (req: Request, res: Response) => {
  res.send('Hello World!');
});
// ------------------------------------------------------------
// User Routes start here
// ------------------------------------------------------------
app.use('/api/v1/user', UserRoutes);
app.use('/api/v1/importer-profile', ImporterProfileRoutes);
app.use('/api/v1/exporter-profile', ExporterProfileRoutes);
app.use('/api/v1/admin', AdminRoutes);
// ------------------------------------------------------------
// User Routes end here
// ------------------------------------------------------------

// ------------------------------------------------------------
// Media and User Storage Routes start here
// ------------------------------------------------------------
app.use('/api/v1/user-storage', UserStorageRoutes);
app.use('/api/v1/media', MediaRoutes);
app.use('/api/v1/category', CategoryRoutes);
app.use('/api/v1/product', ProductRoutes);
// ------------------------------------------------------------
// Media and User Storage Routes end here
// ------------------------------------------------------------

import AppError from './src/errors/AppError';
// 404 handler for unknown routes
app.use((req, res, next) => {
  next(new AppError(`Route ${req.originalUrl} not found`, 404));
});

import globalErrorHandler from './src/middlewares/globalErrorHandler';
app.use(globalErrorHandler);
export default app;
