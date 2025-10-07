import { NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import type { IronSession } from "iron-session";
import { sessionOptions, type SessionData } from "@/lib/session";

type CorevaiSession = IronSession & SessionData;

export async function POST(req: Request) {
    const { email, password } = await req.json();

    const envUser = (process.env.COREVAI_DEFAULT_USER || "").trim().toLowerCase();
    const envPass = (process.env.COREVAI_DEFAULT_PASS || "").trim();
    const inUser = (email || "").trim().toLowerCase();
    const inPass = (password || "").trim();

    if (inUser !== envUser || inPass !== envPass) {
        return NextResponse.json({ ok: false, error: "Invalid credentials" }, { status: 401 });
    }

    const response = NextResponse.json({ ok: true });
    const session = await getIronSession(req, response, sessionOptions);
    const typedSession = session as CorevaiSession;

    typedSession.isLoggedIn = true;
    typedSession.user = { email: envUser };
    await typedSession.save();

    return response;
}
