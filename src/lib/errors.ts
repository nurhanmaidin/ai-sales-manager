/**
 * Errors whose message is safe to show to end users. Anything else is logged
 * server-side and replaced with a generic message.
 */
export class AppError extends Error {
  constructor(
    message: string,
    readonly code:
      | "NOT_FOUND"
      | "FORBIDDEN"
      | "UNAUTHORIZED"
      | "VALIDATION"
      | "RATE_LIMITED"
      | "CONFLICT" = "VALIDATION"
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class NotFoundError extends AppError {
  constructor(entity = "Record") {
    super(`${entity} not found.`, "NOT_FOUND");
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "You don't have permission to do that.") {
    super(message, "FORBIDDEN");
  }
}
