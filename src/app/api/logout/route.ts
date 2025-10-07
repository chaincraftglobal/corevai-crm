import { NextResponse } from "next/server";

export async function POST() {
    const res = NextResponse.json({ ok: true, message: "Logged out" });
    res.cookies.set("corevai_session", "", { maxAge: 0, path: "/" });
    return res;
}