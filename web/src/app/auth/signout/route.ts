import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const origin = request.headers.get("origin");
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const directHost = request.headers.get("host")?.split(",")[0]?.trim();
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const publicOrigin = forwardedHost
    ? `${forwardedProto || requestUrl.protocol.slice(0, -1)}://${forwardedHost}`
    : requestUrl.origin;
  const allowedOrigins = new Set([requestUrl.origin, publicOrigin]);
  if (directHost) allowedOrigins.add(`${requestUrl.protocol}//${directHost}`);
  const fetchSite = request.headers.get("sec-fetch-site");

  if (fetchSite === "cross-site" || (origin && !allowedOrigins.has(origin))) {
    return NextResponse.json({ message: "Pedido inválido." }, { status: 403 });
  }

  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });

  const redirectOrigin = origin && allowedOrigins.has(origin) ? origin : publicOrigin;
  const response = NextResponse.redirect(new URL("/login", redirectOrigin), 303);
  response.headers.set("Clear-Site-Data", '"cache", "storage"');
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  return response;
}
