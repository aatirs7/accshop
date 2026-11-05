import { NextResponse, type NextRequest } from "next/server";
import { AFF_COOKIE, affCookieOptions, cleanAffCode } from "@/lib/affiliate-ref";

/**
 * Cheap early redirect for unauthenticated visitors. This only checks cookie
 * presence, the authoritative session/role checks live server-side in
 * requireUser()/requireAdmin(), which every protected page and action calls.
 */
export function proxy(request: NextRequest) {
  // Any page opened with ?code=AFFILIATE tags the visitor to that affiliate,
  // so links shared before /r/CODE existed keep crediting the right person.
  // Checkout re-validates the code, so nothing is trusted from the cookie.
  if (!request.nextUrl.pathname.startsWith("/dashboard")) {
    const code = cleanAffCode(request.nextUrl.searchParams.get("code"));
    // Checkout reads ?code= itself, so leave that URL alone.
    if (!code || request.nextUrl.pathname.startsWith("/checkout")) {
      const res = NextResponse.next();
      if (code) res.cookies.set(AFF_COOKIE, code, affCookieOptions);
      return res;
    }
    // Store the tag on a redirect to the same page minus ?code=, because a
    // page that redirects on its own (/accounts does) would drop the cookie.
    const clean = request.nextUrl.clone();
    clean.searchParams.delete("code");
    const res = NextResponse.redirect(clean);
    res.cookies.set(AFF_COOKIE, code, affCookieOptions);
    return res;
  }

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
  // /admin is handled by the admin layout itself (it shows the login form when
  // signed out), so it's intentionally not matched here.
  // Pages only (no API, assets or files): the affiliate ?code= tagging runs
  // everywhere, the sign-in redirect only under /dashboard.
  matcher: ["/((?!api|_next/static|_next/image|.*\\..*).*)"],
};
