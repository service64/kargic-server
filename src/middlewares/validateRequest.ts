import { ZodObject } from 'zod';
import { Request, Response, NextFunction } from 'express';

const validateRequest =
  (schema: ZodObject<any>) =>
  (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      next();
    } catch (error: any) {
      return res.status(400).json({
        status: 400,
        message: 'Validation Error',
        data: null,
        errors: error.errors,
      });
    }
  };

export default validateRequest;
