import { NextRequest, NextResponse } from "next/server";
import { consumeLoginToken, setSessionCookie } from "@/lib/auth";

/**
 * Redirect back to the origin the link was issued for. Staying on one origin
 * matters: a cookie set on a different host is dropped by the browser.
 */
function origin(request: NextRequest): string {
  return process.env.APP_URL ?? request.nextUrl.origin;
}

/** Exchange a single-use magic-link token for a session cookie. */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.redirect(new URL("/sign-in?error=missing", origin(request)));

  const userId = await consumeLoginToken(token);
  if (!userId) return NextResponse.redirect(new URL("/sign-in?error=expired", origin(request)));

  await setSessionCookie(userId);
  return NextResponse.redirect(new URL("/", origin(request)));
}
