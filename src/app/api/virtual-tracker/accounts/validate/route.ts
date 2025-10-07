// src/app/api/virtual-tracker/accounts/validate/route.ts
import { NextRequest, NextResponse } from "next/server";
import { validateCredentials } from "@/server/virtual-tracker/browser";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const username = String(body?.username ?? "");
    const password = String(body?.password ?? "");
    const loginUrl =
      String(body?.loginUrl ?? "") ||
      process.env.EVP_LOGIN_URL ||
      "https://evirtualpay.com/v2/vp_interface/login";

    if (!username || !password) {
      return NextResponse.json(
        { ok: false, message: "username and password are required" },
        { status: 400 }
      );
    }

    const result = await validateCredentials(loginUrl, username, password);
    return NextResponse.json({
      ok: result.ok,
      message: result.message,
      screenshot: result.screenshot,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Validation failed";
    return NextResponse.json({ ok: false, message: msg }, { status: 500 });
  }
}
