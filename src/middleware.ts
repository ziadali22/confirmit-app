import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Gate the whole dashboard behind the shared password, EXCEPT the login page,
// provider webhooks, and the cron endpoint (those authenticate differently).
const OPEN = ["/login", "/api/webhooks", "/api/cron"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (OPEN.some((p) => pathname.startsWith(p))) return NextResponse.next();

  const isProd = process.env.NODE_ENV === "production";
  const secret = process.env.SESSION_SECRET || (isProd ? "" : "dev-secret");
  // No secret in production => deny everything (fail closed).
  const authed = Boolean(secret) && req.cookies.get("cf_auth")?.value === secret;
  if (!authed) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  // Run on everything except Next internals and static assets.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
