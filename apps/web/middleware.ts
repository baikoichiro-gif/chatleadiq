import { NextResponse, type NextRequest } from "next/server";

const protectedPrefixes = ["/dashboard", "/connect", "/chats", "/leads", "/pipeline", "/followups", "/analytics", "/settings"];

export function middleware(request: NextRequest) {
  const isProtected = protectedPrefixes.some((prefix) => request.nextUrl.pathname.startsWith(prefix));
  if (!isProtected) return NextResponse.next();

  const token = request.cookies.get("chatleadiq_token")?.value;
  if (token) return NextResponse.next();

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/dashboard/:path*", "/connect/:path*", "/chats/:path*", "/leads/:path*", "/pipeline/:path*", "/followups/:path*", "/analytics/:path*", "/settings/:path*"]
};
