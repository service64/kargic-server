import { Request, Response, NextFunction } from 'express';
import { ZodError, type ZodType } from 'zod';

const validateRequest =
  (schema: ZodType) =>
  (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      next();
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          status: 400,
          message: 'Validation Error',
          data: null,
          errors: error.issues,
        });
      }
      next(error as Error);
    }
  };

export default validateRequest;
