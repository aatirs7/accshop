import { NextResponse, type NextRequest } from "next/server";

/**
 * Cheap early redirect for unauthenticated visitors. This only checks cookie
 * presence — the authoritative session/role checks live server-side in
 * requireUser()/requireAdmin(), which every protected page and action calls.
 */
export function middleware(request: NextRequest) {
  const hasSession =
    request.cookies.has("authjs.session-token") ||
    request.cookies.has("__Secure-authjs.session-token");

  if (!hasSession) {
    const login = new URL("/login", request.url);
    login.searchParams.set(
      "callbackUrl",
      request.nextUrl.pathname + request.nextUrl.search,
    );
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};
