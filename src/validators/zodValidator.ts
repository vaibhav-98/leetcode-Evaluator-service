import { NextFunction, Request, Response } from "express";
import { ZodSchema } from "zod";

export const validate = (schema: ZodSchema<any>) => (req: Request, res: Response, next: NextFunction) => {
  try {
    schema.parse({
        ...req.body
    }); // Validating only the body as per the schema 
    next();
  } catch (error) {
    console.error(error);
    return res.status(400).json({
      success: false,
      message: "Invalid request params received",
      data: {},
      error,
    });
  }
};

