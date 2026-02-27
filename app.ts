import express from 'express';
import { Request, Response } from 'express';
import { UserRoutes } from './src/modules/user/user.router';
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const port = 3000;

app.get('/', (req: Request, res: Response) => {
  res.send('Hello World!');
});
app.use('/api/v1/user', UserRoutes);

import AppError from './src/errors/AppError';
// 404 handler for unknown routes
app.use((req, res, next) => {
  next(new AppError(`Route ${req.originalUrl} not found`, 404));
});

import globalErrorHandler from './src/middlewares/globalErrorHandler';
app.use(globalErrorHandler);
export default app;
