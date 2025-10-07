// src/lib/auth-guard.ts
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function requireAuth() {
    const jar = await cookies();                // ✅ await the promise
    const sessionCookie = jar.get("corevai_session");

    if (!sessionCookie?.value) {
        redirect("/login");
    }

    // return minimal user info if you want it in pages
    return { email: "admin@corevai.local" };
}