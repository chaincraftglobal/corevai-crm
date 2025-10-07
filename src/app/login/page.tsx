"use client";
import { useState, type CSSProperties } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
    const placeholderEmail = process.env.NEXT_PUBLIC_PREFILL_EMAIL || "admin@corevai.local";
    const [email, setEmail] = useState("");       // start empty
    const [password, setPassword] = useState(""); // start empty
    const [err, setErr] = useState<string | null>(null);
    const router = useRouter();
    const coverStyle: CSSProperties = { objectFit: "cover" };

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        setErr(null);
        const res = await fetch("/api/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
        });
        if (res.ok) router.push("/dashboard");
        else setErr("Invalid credentials");
    }

    return (
        <div className="container-fluid vh-100">
            <div className="row h-100 g-0">
                {/* Left image */}
                <div className="col-lg-6 d-none d-lg-block">
                    <div className="h-100 w-100 position-relative">
                        <img
                            src="https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?q=80&w=1600&auto=format&fit=crop"
                            alt="Onboarding visuals"
                            className="position-absolute top-0 start-0 h-100 w-100 object-fit-cover"
                            style={coverStyle}
                        />
                        <div className="position-absolute top-0 start-0 p-4">
                            <span className="badge bg-primary">Corevai-CRM</span>
                        </div>
                    </div>
                </div>

                {/* Right form */}
                <div className="col-lg-6 d-flex align-items-center justify-content-center">
                    <div className="w-100" style={{ maxWidth: 420 }}>
                        <div className="text-center mb-4">
                            <h1 className="h3 fw-bold">Welcome back</h1>
                            <p className="text-body-secondary mb-0">Sign in to manage onboarding and tracking</p>
                        </div>

                        <form onSubmit={submit} className="card shadow-sm border-0">
                            <div className="card-body p-4">
                                <div className="mb-3">
                                    <label className="form-label">Email</label>
                                    <input
                                        className="form-control"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder={placeholderEmail}   // placeholder only
                                        autoComplete="username"
                                    />
                                </div>

                                <div className="mb-2">
                                    <label className="form-label">Password</label>
                                    <input
                                        type="password"
                                        className="form-control"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        autoComplete="current-password"
                                    />
                                </div>

                                {err && <div className="alert alert-danger py-2 mt-2 mb-0">{err}</div>}

                                <button className="btn btn-primary w-100 mt-3" type="submit">
                                    Sign in
                                </button>

                                <p className="text-center text-muted small mt-3 mb-0">
                                    Default: <code>{placeholderEmail}</code> / <code>admin123</code>
                                </p>
                            </div>
                        </form>

                        <div className="text-center mt-3">
                            <Link href="/" className="text-decoration-none">← Back to home</Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
