// src/lib/session.ts
import type { IronSessionOptions } from "iron-session";

/**
 * The structure of the session object.
 */
export type SessionData = {
    isLoggedIn: boolean;
    user?: { email: string };
};

/**
 * Options used by iron-session to encrypt and store cookies.
 */
export const sessionOptions: IronSessionOptions = {
    password: process.env.SESSION_PASSWORD!,   // must be 32+ chars
    cookieName: "corevai_session",
    cookieOptions: {
        secure: true,          // true in production (HTTPS)
        sameSite: "lax",
        path: "/",
    },
};

/**
 * This file now only holds configuration and types.
 * You do NOT call getIronSession here directly anymore.
 * Instead, import { sessionOptions, SessionData } in your API routes:
 *
 *   import { getIronSession } from "iron-session";
 *   import { sessionOptions } from "@/lib/session";
 *
 *   const session = await getIronSession(req, res, sessionOptions);
 */
