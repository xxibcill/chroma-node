import type { AppError, AppErrorCode, Result, VersionedResponse } from "../shared/ipc.js";
import { IPC_CONTRACT_VERSION } from "../shared/ipc.js";

export function appError(code: AppErrorCode, message: string, detail?: string): AppError {
  return detail ? { code, message, detail } : { code, message };
}

export function ok<T>(value: T): VersionedResponse<T> {
  return {
    version: IPC_CONTRACT_VERSION,
    result: { ok: true, value }
  };
}

export function fail<T>(error: AppError): VersionedResponse<T> {
  return {
    version: IPC_CONTRACT_VERSION,
    result: { ok: false, error }
  };
}

export function toResult<T>(fn: () => Promise<T>): Promise<Result<T>> {
  return fn()
    .then((value) => ({ ok: true as const, value }))
    .catch((error: unknown) => ({
      ok: false as const,
      error:
        isAppError(error) ? error : appError("UNKNOWN", "Unexpected application error.", String(error))
    }));
}

export function isAppError(error: unknown): error is AppError {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    "message" in error &&
    typeof (error as AppError).code === "string" &&
    typeof (error as AppError).message === "string"
  );
}
