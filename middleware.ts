import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Demo role-based gating using a cookie `role`: 'admin' | 'marketing' | 'user'
export function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  const role = req.cookies.get("role")?.value || "user";

  if (url.pathname.startsWith("/admin")) {
    if (role !== "admin") {
      url.pathname = "/";
      url.searchParams.set("denied", "admin");
      return NextResponse.redirect(url);
    }
  }
  if (url.pathname.startsWith("/marketing")) {
    if (role !== "marketing" && role !== "admin") {
      url.pathname = "/";
      url.searchParams.set("denied", "marketing");
      return NextResponse.redirect(url);
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/marketing/:path*"],
};

