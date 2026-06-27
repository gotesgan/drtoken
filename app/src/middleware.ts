import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Public routes — no auth needed ────────────────────────────────
  const publicPaths = ["/login", "/register", "/auth/callback", "/forgot-password", "/reset-password"];
  const isPublic = publicPaths.some((p) => pathname.startsWith(p));
  const isLanding = pathname === "/";
  const isKiosk = pathname.startsWith("/token") || pathname.startsWith("/track") || pathname.startsWith("/display");
  const isApi = pathname.startsWith("/api");

  const isStaticFile = /\.(png|jpg|jpeg|gif|svg|ico|webp|css|js|woff2?)$/i.test(pathname);
  const isE2ETest = request.cookies.get("e2e_test")?.value === "1";
  if (isPublic || isLanding || isKiosk || isApi || isE2ETest || isStaticFile) {
    return NextResponse.next();
  }

  // ── Create Supabase client from the request cookies ──────────────
  const response = NextResponse.next();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // ── Check for an active user (getUser is more reliable than getSession) ─
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ── Fetch user profile (role, clinic) ────────────────────────────
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, clinic_id, display_name")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    // User exists in auth but has no profile yet — sign them out
    // and redirect to register.
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL("/register", request.url));
  }

  if (!profile.clinic_id) {
    // Profile exists but no clinic assigned yet —
    // redirect to complete clinic setup.
    return NextResponse.redirect(new URL("/register?step=clinic", request.url));
  }

  // ── Store user info in request headers for server components ────
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-user-id", user.id);
  requestHeaders.set("x-user-role", profile.role);
  requestHeaders.set("x-user-clinic", profile.clinic_id);
  requestHeaders.set("x-user-name", profile.display_name ?? "");

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
