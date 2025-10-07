import { NextResponse } from "next/server";

export async function GET() {
    const env = {
        NODE_ENV: process.env.NODE_ENV,
        ADMIN_EMAIL: process.env.ADMIN_EMAIL,
    };
    return NextResponse.json({ ok: true, env });
}