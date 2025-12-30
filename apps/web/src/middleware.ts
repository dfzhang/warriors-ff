import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Allow embedding for Sanity presentation mode
  // Remove X-Frame-Options to allow iframe embedding
  response.headers.delete("X-Frame-Options");
  
  // Set Content-Security-Policy to allow Sanity domains
  response.headers.set(
    "Content-Security-Policy",
    "frame-ancestors 'self' https://*.sanity.studio https://*.sanity.io;"
  );

  return response;
}

export const config = {
  matcher: "/:path*",
};

