/** Shared helpers for API route handlers. */

import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { UnauthorizedError } from "./auth";
import { Prisma } from "@prisma/client";

export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json(data as object, { status });
}

export function jsonError(message: string, status = 400, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status });
}

/** Wrap a handler so validation, auth and database errors become clean JSON. */
export async function handle<T>(fn: () => Promise<T>): Promise<NextResponse> {
  try {
    const result = await fn();
    if (result instanceof NextResponse) return result;
    return jsonOk(result ?? { ok: true });
  } catch (error) {
    if (error instanceof UnauthorizedError) return jsonError("Not signed in", 401);
    if (error instanceof HttpError) return jsonError(error.message, error.status);
    if (error instanceof ZodError) {
      const first = error.issues[0];
      return jsonError(first?.message ?? "Invalid input", 422, error.issues);
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") return jsonError("That name is already in use", 409);
      if (error.code === "P2003" || error.code === "P2025") return jsonError("Record not found", 404);
    }
    console.error(error);
    return jsonError(error instanceof Error ? error.message : "Unexpected error", 500);
  }
}

export class HttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export function assertFound(condition: boolean, message = "Record not found"): asserts condition {
  if (!condition) throw new HttpError(message, 404);
}
