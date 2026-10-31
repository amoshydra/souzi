import type { TFunction } from "i18next";
import type { en } from "./locales/en";

/**
 * User-facing error codes. The value is a translation key, so components can
 * render the translated message and it follows the UI language.
 */
export type ErrorCode = `errors.${keyof typeof en.errors}`;

export type ErrorParams = Record<string, string | number>;

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly params?: ErrorParams;

  constructor(code: ErrorCode, params?: ErrorParams, options?: ErrorOptions) {
    super(code, options);
    this.name = "AppError";
    this.code = code;
    this.params = params;
  }
}

export function isAppError(value: unknown): value is AppError {
  return value instanceof AppError;
}

/**
 * Convert an unknown thrown value to a user-facing AppError. The original
 * error is kept as `cause` for console/debugging; its English text is not
 * rendered in the UI.
 */
export function asAppError(reason: unknown, fallback: ErrorCode): AppError {
  if (reason instanceof AppError) return reason;
  if (reason instanceof Error) {
    return new AppError(fallback, undefined, { cause: reason });
  }
  return new AppError(fallback);
}

/**
 * Render an AppError through i18next. The cast is limited to the i18next
 * boundary because error params are dynamic by nature; the error code itself
 * is still fully typed.
 */
export function translateError(t: TFunction, error: AppError): string {
  return String(t(error.code, (error.params ?? {}) as never));
}
