import { ZodSchema } from "zod";
import { HttpError } from "./errors.js";

export function parseBody<T>(schema: ZodSchema<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) {
    throw new HttpError(400, result.error.errors.map((err) => err.message).join(", "));
  }
  return result.data;
}
