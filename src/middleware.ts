import { NextRequest, NextResponse } from "next/server";

// Optional single-password gate. By default the app has NO login (APP_PASSWORD
// unset) and this middleware does nothing. If you later set an APP_PASSWORD
// environment variable, the whole site is protected by HTTP Basic Auth with
// username "sheila" and that password — no code changes needed.
export function middleware(req: NextRequest) {
  const password = process.env.APP_PASSWORD;
  if (!password) return NextResponse.next();

  const header = req.headers.get("authorization");
  if (header) {
    const [scheme, encoded] = header.split(" ");
    if (scheme === "Basic" && encoded) {
      const [, pass] = atob(encoded).split(":");
      if (pass === password) return NextResponse.next();
    }
  }

  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Glazes"' },
  });
}

export const config = {
  // Protect everything except Next internals and static assets.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
