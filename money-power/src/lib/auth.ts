/**
 * Passwordless (magic link) authentication.
 *
 * A sign-in request mints a random token, stores only its SHA-256 hash, and
 * emails a single-use link. Following the link exchanges the token for an
 * HMAC-signed, HttpOnly session cookie. Every data query is scoped by the
 * userId carried in that cookie, which is how per-user isolation is enforced.
 */

import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "./db";

export const SESSION_COOKIE = "mp_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days
const LOGIN_TOKEN_TTL_MS = 1000 * 60 * 20; // 20 minutes

function authSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("AUTH_SECRET must be set to a random string of at least 16 characters");
  }
  return secret;
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

function sign(payload: string): string {
  return createHmac("sha256", authSecret()).update(payload).digest("base64url");
}

/** Build a signed session value: base64url(json).signature */
export function createSessionValue(userId: string, now: Date = new Date()): string {
  const payload = base64url(
    JSON.stringify({ sub: userId, exp: Math.floor(now.getTime() / 1000) + SESSION_TTL_SECONDS }),
  );
  return `${payload}.${sign(payload)}`;
}

/** Verify a session value and return the userId, or null. */
export function readSessionValue(value: string | undefined | null): string | null {
  if (!value) return null;
  const [payload, signature] = value.split(".");
  if (!payload || !signature) return null;

  const expected = Buffer.from(sign(payload));
  const provided = Buffer.from(signature);
  if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) return null;

  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      sub?: string;
      exp?: number;
    };
    if (!decoded.sub || !decoded.exp) return null;
    if (decoded.exp * 1000 < Date.now()) return null;
    return decoded.sub;
  } catch {
    return null;
  }
}

export function hashLoginToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Create a single-use login token for a user and return the raw token. */
export async function createLoginToken(userId: string): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  await prisma.loginToken.create({
    data: {
      userId,
      tokenHash: hashLoginToken(token),
      expiresAt: new Date(Date.now() + LOGIN_TOKEN_TTL_MS),
    },
  });
  return token;
}

/** Consume a login token; returns the userId when the token is valid. */
export async function consumeLoginToken(token: string): Promise<string | null> {
  const record = await prisma.loginToken.findUnique({ where: { tokenHash: hashLoginToken(token) } });
  if (!record || record.usedAt || record.expiresAt < new Date()) return null;
  await prisma.loginToken.update({ where: { id: record.id }, data: { usedAt: new Date() } });
  return record.userId;
}

/**
 * Cookies are marked Secure for https deployments. APP_URL is the source of
 * truth when it is set, so an http self-host or an end-to-end run against a
 * local build still receives a usable session cookie.
 */
export function shouldUseSecureCookies(): boolean {
  const appUrl = process.env.APP_URL;
  if (appUrl) return appUrl.startsWith("https://");
  return process.env.NODE_ENV === "production";
}

export async function setSessionCookie(userId: string): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, createSessionValue(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: shouldUseSecureCookies(),
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/** The signed-in userId, or null. */
export async function getSessionUserId(): Promise<string | null> {
  const store = await cookies();
  return readSessionValue(store.get(SESSION_COOKIE)?.value);
}

export class UnauthorizedError extends Error {
  constructor() {
    super("Not signed in");
    this.name = "UnauthorizedError";
  }
}

/** The signed-in user, or throws UnauthorizedError. Use in every API route. */
export async function requireUser() {
  const userId = await getSessionUserId();
  if (!userId) throw new UnauthorizedError();
  const user = await prisma.userProfile.findUnique({ where: { id: userId } });
  if (!user) throw new UnauthorizedError();
  return user;
}
