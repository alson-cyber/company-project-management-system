import { z } from "zod";

export type AppErrorCode = "UNAUTHENTICATED" | "FORBIDDEN" | "NOT_FOUND" | "VALIDATION" | "CONFLICT";

export type FieldErrors = Record<string, string[]>;

export class AppError extends Error {
  constructor(
    readonly code: AppErrorCode,
    message: string,
    readonly fieldErrors?: FieldErrors,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class UnauthenticatedError extends AppError {
  constructor(message = "You need to sign in to continue.") {
    super("UNAUTHENTICATED", message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "You do not have permission to do that.") {
    super("FORBIDDEN", message);
  }
}

/** Also used when a resource exists but the caller may not see it, so existence is not leaked. */
export class NotFoundError extends AppError {
  constructor(message = "Not found.") {
    super("NOT_FOUND", message);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, fieldErrors?: FieldErrors) {
    super("VALIDATION", message, fieldErrors);
  }

  static fromZod(error: z.ZodError): ValidationError {
    const flattened = z.flattenError(error);
    const fieldErrors: FieldErrors = {};
    for (const [field, messages] of Object.entries(flattened.fieldErrors)) {
      if (Array.isArray(messages) && messages.length > 0) fieldErrors[field] = messages;
    }
    const message = flattened.formErrors[0] ?? "Please correct the highlighted fields.";
    return new ValidationError(message, fieldErrors);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, fieldErrors?: FieldErrors) {
    super("CONFLICT", message, fieldErrors);
  }
}

export function parseInput<Schema extends z.ZodType>(schema: Schema, input: unknown): z.output<Schema> {
  const result = schema.safeParse(input);
  if (!result.success) throw ValidationError.fromZod(result.error);
  return result.data;
}

export type ActionError = {
  code: AppErrorCode | "INTERNAL";
  message: string;
  fieldErrors?: FieldErrors;
};

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: ActionError };

export function actionSuccess<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

/** Converts a thrown error into a serialisable result for Server Actions. Unknown errors are not exposed. */
export function toActionError(error: unknown): { ok: false; error: ActionError } {
  if (error instanceof AppError) {
    return {
      ok: false,
      error: {
        code: error.code,
        message: error.message,
        ...(error.fieldErrors ? { fieldErrors: error.fieldErrors } : {}),
      },
    };
  }
  console.error(error);
  return { ok: false, error: { code: "INTERNAL", message: "Something went wrong. Please try again." } };
}
